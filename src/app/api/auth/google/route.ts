import { redirect } from "next/navigation";
import { siteOrigin } from "@/lib/admin-api";
import { safeNext } from "@/lib/account";
import { FLOW_COOKIE, googleEnabled, startFlow } from "@/lib/google";
import { tooMany } from "@/lib/limit";

/** Starts "Continue with Google": ?next=/where-to-land */
export async function GET(req: Request) {
  if (!googleEnabled) redirect("/account/sign-in");
  const limited = tooMany(req, "google", 20);
  if (limited) return limited;
  const next = safeNext(new URL(req.url).searchParams.get("next"));
  const { url, cookie } = startFlow(`${siteOrigin(req)}/api/auth/google/callback`, next);
  const res = new Response(null, { status: 302, headers: { Location: url } });
  res.headers.append(
    "Set-Cookie",
    `${FLOW_COOKIE}=${cookie}; Path=/api/auth/google; Max-Age=600; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
  );
  return res;
}
