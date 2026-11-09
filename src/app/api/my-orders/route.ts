import { tooMany } from "@/lib/limit";
import { adminFetch, checkoutEnabled } from "@/lib/admin-api";

/** "Email me my orders": the admin emails the list to that address only. */
export async function POST(req: Request) {
  if (!checkoutEnabled) return Response.json({ error: "Orders aren't open yet." }, { status: 503 });
  const limited = tooMany(req, "my-orders", 5);
  if (limited) return limited;
  const { email } = await req.json().catch(() => ({}));
  const res = await adminFetch("/orders", { method: "POST", body: JSON.stringify({ email }) });
  return Response.json(await res.json().catch(() => ({})), { status: res.status });
}
