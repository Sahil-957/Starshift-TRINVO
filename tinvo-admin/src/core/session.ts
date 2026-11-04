import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { AccessDenied, assertCanAccess, type Action } from "./access.ts";

/** The signed-in user, or a redirect to sign in. Call at the top of every page and action. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  return session.user;
}

/** Signed-in user who may `action` this shop; anyone else gets a 404, never the data. */
export async function requireShop(shopId: string, action: Action) {
  const user = await requireUser();
  try {
    return { user, role: await assertCanAccess(user.id, shopId, action) };
  } catch (e) {
    if (e instanceof AccessDenied) notFound();
    throw e;
  }
}
