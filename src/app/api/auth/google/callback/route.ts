import { cookies } from "next/headers";
import { siteOrigin } from "@/lib/admin-api";
import { accountCall, safeNext, setSession } from "@/lib/account";
import { FLOW_COOKIE, finishFlow, readFlow } from "@/lib/google";

/** Google sends the browser back here with ?code&state. */
export async function GET(req: Request) {
  const origin = siteOrigin(req);
  const q = new URL(req.url).searchParams;
  const jar = await cookies();
  const flow = readFlow(jar.get(FLOW_COOKIE)?.value);
  jar.delete({ name: FLOW_COOKIE, path: "/api/auth/google" });
  // not Response.redirect: its headers are immutable, and the session cookie has to be added to them
  const go = (path: string) => new Response(null, { status: 303, headers: { Location: `${origin}${path}` } });
  const fail = (why: string) => go(`/account/sign-in?error=${why}`);

  if (q.get("error") === "access_denied") return fail("google-cancelled");
  const code = q.get("code");
  // state must match what this browser was given, or someone else started the flow
  if (!flow || !code || q.get("state") !== flow.state) return fail("google");
  try {
    const who = await finishFlow(code, flow, `${origin}/api/auth/google/callback`);
    const r = await accountCall("google", who);
    if (!r.ok || !r.data.session) return fail("google");
    await setSession(r.data.session);
    return go(safeNext(flow.next));
  } catch (e) {
    console.error("google sign-in:", (e as Error).message);
    return fail("google");
  }
}
