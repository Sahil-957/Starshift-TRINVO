import {
  account,
  changePassword,
  googleSignIn,
  requestReset,
  resendVerify,
  resetPassword,
  signIn,
  signOut,
  signUp,
  verifyEmail,
} from "@/core/customers";
import { CheckoutError } from "@/core/orders";
import { storefront } from "../handler";

/**
 * Customer accounts, server to server only. Body: { action, ...fields }; the
 * signed-in customer is identified by `session` (the storefront keeps it in an
 * httpOnly cookie, so it never reaches page scripts).
 */
export const POST = storefront(async (shopId, req) => {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const session = typeof b.session === "string" ? b.session : "";
  switch (b.action) {
    case "me":
      return account(shopId, session);
    case "sign-up":
      return signUp(shopId, b);
    case "sign-in":
      return signIn(shopId, b);
    case "google":
      return googleSignIn(shopId, b);
    case "sign-out":
      return signOut(shopId, session);
    case "resend-verify":
      return resendVerify(shopId, session);
    case "verify":
      return verifyEmail(shopId, String(b.token ?? ""));
    case "forgot":
      return requestReset(shopId, b);
    case "reset":
      return resetPassword(shopId, b);
    case "change-password":
      return changePassword(shopId, b);
    default:
      throw new CheckoutError("Unknown account action.");
  }
});
