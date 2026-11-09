/**
 * Storefront customer accounts. Passwords are bcrypt-hashed; sessions and email
 * links are random 256-bit tokens of which only a SHA-256 is stored. Orders are
 * matched by email, so they show only after the customer proves the email is
 * theirs (the verify link, a password reset, or Google, which verifies it).
 * Passwords found in public data leaks are refused (Have I Been Pwned, by
 * k-anonymity: only the first 5 characters of the password's SHA-1 leave the server).
 */
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, desc, eq, gt, inArray, lt, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db, withShop, type Tx } from "../db/index.ts";
import { customers, customerTokens, orderItems, orders, shops } from "../db/schema.ts";
import { sendMail } from "../lib/mail.ts";
import { accountLink } from "./email-templates.ts";
import { CheckoutError } from "./orders.ts";

const DAY = 86_400_000;
const LIFETIME = { session: 30 * DAY, verify: 2 * DAY, reset: 60 * 60_000 } as const;
type Kind = keyof typeof LIFETIME;

const email = z.string().trim().toLowerCase().max(200).pipe(z.email("Enter a valid email address."));
const password = z.string().min(8, "Use at least 8 characters for your password.").max(200, "That password is too long.");
const name = z.string().trim().min(1, "Enter your name.").max(80);
const token = z.string().min(20).max(100);

const sha = (t: string) => createHash("sha256").update(t).digest("hex");
const decoy = bcrypt.hashSync("decoy-password-for-timing", 12);

async function issue(tx: Tx, shopId: string, customerId: string, kind: Kind) {
  const raw = randomBytes(32).toString("base64url");
  await tx.insert(customerTokens).values({ shopId, customerId, kind, tokenHash: sha(raw), expiresAt: new Date(Date.now() + LIFETIME[kind]) });
  return raw;
}

/** The customer a live token belongs to, or null. */
async function holder(tx: Tx, shopId: string, raw: string, kind: Kind) {
  if (!token.safeParse(raw).success) return null;
  const [row] = await tx
    .select({ customer: customers, tokenId: customerTokens.id })
    .from(customerTokens)
    .innerJoin(customers, eq(customers.id, customerTokens.customerId))
    .where(
      and(
        eq(customerTokens.shopId, shopId),
        eq(customerTokens.tokenHash, sha(raw)),
        eq(customerTokens.kind, kind),
        gt(customerTokens.expiresAt, new Date()),
      ),
    );
  return row ?? null;
}

const dropTokens = (tx: Tx, customerId: string, kinds: Kind[]) =>
  tx.delete(customerTokens).where(and(eq(customerTokens.customerId, customerId), inArray(customerTokens.kind, kinds)));

const publicCustomer = (c: typeof customers.$inferSelect) => ({
  name: c.name,
  email: c.email,
  verified: !!c.emailVerifiedAt,
  hasPassword: !!c.passwordHash,
});

/** True when the password is in a known data leak. Fails open: if the service is down, the password is allowed. */
export async function leaked(password: string) {
  const hash = createHash("sha1").update(password).digest("hex").toUpperCase();
  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`, {
      headers: { "Add-Padding": "true", "User-Agent": "tinvo-storefront" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return false;
    return (await res.text()).split("\n").some((l) => l.startsWith(hash.slice(5)) && !l.trim().endsWith(":0"));
  } catch {
    return false;
  }
}

async function newPasswordHash(password: string) {
  if (await leaked(password))
    throw new CheckoutError("This password has shown up in a data leak, so it's easy to guess. Please choose a different one.", "password");
  return bcrypt.hash(password, 12);
}

// ─── emails ─────────────────────────────────────────────────────────────────

async function sendLink(shopId: string, to: string, kind: "verify" | "reset" | "welcome", raw = "") {
  const [shop] = await db.select().from(shops).where(eq(shops.id, shopId));
  if (!shop.primaryDomain) throw new Error("The shop has no website domain set, so email links can't be made.");
  const url = kind === "welcome" ? `https://${shop.primaryDomain}/account` : `https://${shop.primaryDomain}/account/${kind}?token=${raw}`;
  const e =
    kind === "welcome"
      ? accountLink({
          shop: shop.name,
          domain: shop.primaryDomain,
          subject: `Welcome to ${shop.name}`,
          title: `Welcome to ${shop.name}`,
          intro: `Your account is ready. Every order placed with ${to} shows up in My account, with its status and tracking link, and checkout fills in your details for you.`,
          button: "Go to my account",
          url,
          note: "Questions about an order or a design? Just reply to this email.",
        })
      : kind === "verify"
      ? accountLink({
          shop: shop.name,
          domain: shop.primaryDomain,
          subject: `Confirm your ${shop.name} account`,
          title: "Confirm your email",
          intro: "Tap below to confirm this is your email. Your orders then show up in your account.",
          button: "Confirm my email",
          url,
          note: "The link works for 48 hours. Didn't create an account? Ignore this email.",
        })
      : accountLink({
          shop: shop.name,
          domain: shop.primaryDomain,
          subject: `Reset your ${shop.name} password`,
          title: "Reset your password",
          intro: "Tap below to choose a new password.",
          button: "Choose a new password",
          url,
          note: "The link works for 1 hour and only once. Didn't ask for this? Ignore this email; your password stays the same.",
        });
  await sendMail({ to, subject: e.subject, text: e.text, html: e.html, fromName: shop.name });
}

const mailSafely = (p: Promise<unknown>) => p.catch((e) => console.error("email (account) failed:", (e as Error).message));

// ─── actions ────────────────────────────────────────────────────────────────

export async function signUp(shopId: string, raw: { name?: unknown; email?: unknown; password?: unknown }) {
  const input = z.object({ name, email, password }).parse(raw);
  const passwordHash = await newPasswordHash(input.password);
  const { session, verify } = await withShop(shopId, async (tx) => {
    const [existing] = await tx.select().from(customers).where(and(eq(customers.shopId, shopId), eq(customers.email, input.email)));
    if (existing?.emailVerifiedAt)
      throw new CheckoutError("There's already an account with this email. Sign in instead, or reset your password.", "email");
    let id: string;
    if (existing) {
      // never confirmed: whoever proves the email owns it, so start it over
      await tx.update(customers).set({ name: input.name, passwordHash }).where(eq(customers.id, existing.id));
      await dropTokens(tx, existing.id, ["session", "verify", "reset"]);
      id = existing.id;
    } else {
      [{ id }] = await tx.insert(customers).values({ shopId, email: input.email, name: input.name, passwordHash }).returning({ id: customers.id });
    }
    return { session: await issue(tx, shopId, id, "session"), verify: await issue(tx, shopId, id, "verify") };
  });
  await mailSafely(sendLink(shopId, input.email, "verify", verify));
  return { session };
}

export async function signIn(shopId: string, raw: { email?: unknown; password?: unknown }) {
  const parsed = z.object({ email, password: z.string().max(200) }).safeParse(raw);
  const wrong = new CheckoutError("That email and password don't match.");
  if (!parsed.success) throw wrong;
  return withShop(shopId, async (tx) => {
    const [c] = await tx.select().from(customers).where(and(eq(customers.shopId, shopId), eq(customers.email, parsed.data.email)));
    // compare even when there's no account, so timing doesn't reveal who has one
    const ok = await bcrypt.compare(parsed.data.password, c?.passwordHash ?? decoy); // Google-only accounts have none
    if (!c || !ok) throw wrong;
    await tx.delete(customerTokens).where(and(eq(customerTokens.customerId, c.id), lt(customerTokens.expiresAt, new Date())));
    return { session: await issue(tx, shopId, c.id, "session") };
  });
}

export const signOut = (shopId: string, session: string) =>
  withShop(shopId, async (tx) => {
    if (token.safeParse(session).success)
      await tx.delete(customerTokens).where(and(eq(customerTokens.shopId, shopId), eq(customerTokens.tokenHash, sha(session))));
    return { ok: true };
  });

export async function resendVerify(shopId: string, session: string) {
  const r = await withShop(shopId, async (tx) => {
    const h = await holder(tx, shopId, session, "session");
    if (!h) throw new CheckoutError("Please sign in again.");
    if (h.customer.emailVerifiedAt) return null;
    await dropTokens(tx, h.customer.id, ["verify"]);
    return { to: h.customer.email, raw: await issue(tx, shopId, h.customer.id, "verify") };
  });
  if (r) await sendLink(shopId, r.to, "verify", r.raw);
  return { ok: true };
}

export const verifyEmail = (shopId: string, raw: string) =>
  withShop(shopId, async (tx) => {
    const h = await holder(tx, shopId, raw, "verify");
    if (!h) return { ok: false };
    // not single-use: mail scanners often open links before the customer does, and confirming twice is harmless
    await tx.update(customers).set({ emailVerifiedAt: sql`coalesce(${customers.emailVerifiedAt}, now())` }).where(eq(customers.id, h.customer.id));
    return { ok: true, welcomeTo: h.customer.emailVerifiedAt ? null : h.customer.email };
  }).then(async (r) => {
    if (r.welcomeTo) await mailSafely(sendLink(shopId, r.welcomeTo, "welcome"));
    return { ok: r.ok };
  });

/** Always answers the same, so it can't be used to find out who has an account. */
export async function requestReset(shopId: string, raw: { email?: unknown }) {
  const parsed = email.safeParse(raw.email);
  if (!parsed.success) throw new CheckoutError("Enter a valid email address.");
  const r = await withShop(shopId, async (tx) => {
    const [c] = await tx.select().from(customers).where(and(eq(customers.shopId, shopId), eq(customers.email, parsed.data)));
    if (!c) return null;
    await dropTokens(tx, c.id, ["reset"]);
    return { to: c.email, raw: await issue(tx, shopId, c.id, "reset") };
  });
  if (r) await mailSafely(sendLink(shopId, r.to, "reset", r.raw));
  return { ok: true };
}

/** Sets the new password, confirms the email (the link came by email) and signs out every other device. */
export async function resetPassword(shopId: string, raw: { token?: unknown; password?: unknown }) {
  const input = z.object({ token: z.string(), password }).parse(raw);
  const passwordHash = await newPasswordHash(input.password);
  return withShop(shopId, async (tx) => {
    const h = await holder(tx, shopId, input.token, "reset");
    if (!h) throw new CheckoutError("This reset link has expired or was already used. Ask for a new one.");
    await tx
      .update(customers)
      .set({ passwordHash, emailVerifiedAt: sql`coalesce(${customers.emailVerifiedAt}, now())` })
      .where(eq(customers.id, h.customer.id));
    await dropTokens(tx, h.customer.id, ["session", "verify", "reset"]);
    return { session: await issue(tx, shopId, h.customer.id, "session") };
  });
}

/**
 * "Continue with Google". The storefront has already checked Google's ID token
 * (fetched straight from Google over TLS, audience = our client, email_verified),
 * and this API is only reachable with the storefront's secret token.
 */
export async function googleSignIn(shopId: string, raw: { email?: unknown; name?: unknown }) {
  const input = z.object({ email, name: z.string().trim().max(80).catch("") }).parse(raw);
  const r = await withShop(shopId, async (tx) => {
    const [existing] = await tx.select().from(customers).where(and(eq(customers.shopId, shopId), eq(customers.email, input.email)));
    let id: string;
    let welcome = false;
    if (!existing) {
      [{ id }] = await tx
        .insert(customers)
        .values({ shopId, email: input.email, name: input.name || input.email.split("@")[0], passwordHash: null, emailVerifiedAt: new Date() })
        .returning({ id: customers.id });
      welcome = true;
    } else if (!existing.emailVerifiedAt) {
      // someone registered this email without proving it; Google just proved who owns it, so that password goes
      await tx.update(customers).set({ passwordHash: null, emailVerifiedAt: new Date() }).where(eq(customers.id, existing.id));
      await dropTokens(tx, existing.id, ["session", "verify", "reset"]);
      id = existing.id;
      welcome = true;
    } else {
      id = existing.id;
    }
    return { session: await issue(tx, shopId, id, "session"), welcome };
  });
  if (r.welcome) await mailSafely(sendLink(shopId, input.email, "welcome"));
  return { session: r.session };
}

/** Needs the current password (unless there isn't one yet); signs out every other device. */
export async function changePassword(shopId: string, raw: { session?: unknown; current?: unknown; password?: unknown }) {
  const input = z.object({ session: z.string(), current: z.string().max(200).default(""), password }).parse(raw);
  const passwordHash = await newPasswordHash(input.password);
  return withShop(shopId, async (tx) => {
    const h = await holder(tx, shopId, input.session, "session");
    if (!h) throw new CheckoutError("Please sign in again.");
    // a Google-only account adding its first password: being signed in is enough
    if (h.customer.passwordHash && !(await bcrypt.compare(input.current, h.customer.passwordHash)))
      throw new CheckoutError("Your current password is wrong.", "current");
    await tx.update(customers).set({ passwordHash }).where(eq(customers.id, h.customer.id));
    await dropTokens(tx, h.customer.id, ["session", "reset"]);
    return { session: await issue(tx, shopId, h.customer.id, "session") };
  });
}

/** The signed-in customer, their orders (once verified) and their last address for checkout. */
export const account = (shopId: string, session: string) =>
  withShop(shopId, async (tx) => {
    const h = await holder(tx, shopId, session, "session");
    if (!h) return { customer: null };
    const c = h.customer;
    if (!c.emailVerifiedAt) return { customer: publicCustomer(c), orders: [], lastAddress: null };
    const list = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.shopId, shopId), eq(sql`lower(${orders.email})`, c.email), ne(orders.status, "pending_payment")))
      .orderBy(desc(orders.createdAt))
      .limit(100);
    const items = list.length
      ? await tx
          .select({ orderId: orderItems.orderId, title: orderItems.title, slug: orderItems.slug, quantity: orderItems.quantity })
          .from(orderItems)
          .where(inArray(orderItems.orderId, list.map((o) => o.id)))
      : [];
    const last = list[0];
    return {
      customer: publicCustomer(c),
      orders: list.map((o) => ({
        number: o.number,
        status: o.status,
        placedAt: o.createdAt,
        totalMinor: o.totalMinor,
        courier: o.courier,
        awb: o.awb,
        trackingUrl: o.trackingUrl,
        items: items.filter((i) => i.orderId === o.id).map(({ title, slug, quantity }) => ({ title, slug, quantity })),
      })),
      lastAddress: last ? { name: last.customerName, phone: last.phone, ...last.shippingAddress } : null,
    };
  });
