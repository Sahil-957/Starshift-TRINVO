/**
 * "Continue with Google" (OpenID Connect, authorisation-code flow with PKCE).
 * Shows only when GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set on the server.
 */
import { createHash, randomBytes } from "node:crypto";

const id = process.env.GOOGLE_CLIENT_ID;
const secret = process.env.GOOGLE_CLIENT_SECRET;
export const googleEnabled = Boolean(id && secret);

export const FLOW_COOKIE = "tinvo_google";
const b64url = (b: Buffer) => b.toString("base64url");

/** Where to send the browser, plus what to remember (in a short-lived cookie) to check Google's reply. */
export function startFlow(redirectUri: string, next: string) {
  const flow = { state: b64url(randomBytes(24)), nonce: b64url(randomBytes(24)), verifier: b64url(randomBytes(48)), next };
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: id!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: flow.state,
    nonce: flow.nonce,
    code_challenge: b64url(createHash("sha256").update(flow.verifier).digest()),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return { url: url.toString(), cookie: b64url(Buffer.from(JSON.stringify(flow))) };
}

export type Flow = { state: string; nonce: string; verifier: string; next: string };

export function readFlow(cookie: string | undefined): Flow | null {
  try {
    const f = JSON.parse(Buffer.from(cookie ?? "", "base64url").toString());
    return typeof f.state === "string" && typeof f.nonce === "string" && typeof f.verifier === "string" ? f : null;
  } catch {
    return null;
  }
}

/**
 * Trades the code for Google's ID token and checks it. The token comes straight
 * from Google's token endpoint over TLS, which OpenID Connect (Core §3.1.3.7)
 * accepts in place of checking its signature; the claims are still all checked.
 */
export async function finishFlow(code: string, flow: Flow, redirectUri: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: id!,
      client_secret: secret!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: flow.verifier,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status})`);
  const { id_token } = (await res.json()) as { id_token?: string };
  const claims = JSON.parse(Buffer.from(String(id_token).split(".")[1] ?? "", "base64url").toString()) as {
    iss?: string;
    aud?: string;
    exp?: number;
    nonce?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
  };
  const ok =
    (claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com") &&
    claims.aud === id &&
    (claims.exp ?? 0) * 1000 > Date.now() &&
    claims.nonce === flow.nonce &&
    claims.email_verified === true &&
    typeof claims.email === "string";
  if (!ok) throw new Error("Google's sign-in reply didn't check out");
  return { email: claims.email!, name: claims.name ?? "" };
}
