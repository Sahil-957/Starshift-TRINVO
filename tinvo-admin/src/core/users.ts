import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.ts";
import { auditLogs, organisationMembers, organisations, users } from "../db/schema.ts";

export const passwordRule = z.string().min(12, "Use at least 12 characters").max(200);

export const findUserByEmail = async (email: string) =>
  (await db.select().from(users).where(eq(sql`lower(${users.email})`, email.trim().toLowerCase())))[0];

// compared against when the email is unknown, so timing doesn't reveal which emails exist
const decoy = bcrypt.hashSync("decoy-password-for-timing", 12);

/** The user if the password matches, else null. */
export async function verifyLogin(email: string, password: string) {
  const user = await findUserByEmail(email);
  const ok = await bcrypt.compare(password, user?.passwordHash ?? decoy);
  return user && ok ? user : null;
}

/** First account: a user who owns a new organisation. */
export async function createOwner(input: { email: string; name: string; password: string; orgName: string }) {
  const email = z.email().parse(input.email.trim().toLowerCase());
  const password = passwordRule.parse(input.password);
  const passwordHash = await bcrypt.hash(password, 12);
  return db.transaction(async (tx) => {
    const [org] = await tx.insert(organisations).values({ name: input.orgName.trim() }).returning();
    const [user] = await tx.insert(users).values({ email, name: input.name.trim(), passwordHash }).returning();
    await tx.insert(organisationMembers).values({ orgId: org.id, userId: user.id, role: "owner" });
    await tx.insert(auditLogs).values({
      orgId: org.id,
      actorUserId: user.id,
      action: "organisation.create",
      targetType: "organisation",
      targetId: org.id,
      after: { name: org.name, owner: email },
    });
    return { org, user };
  });
}
