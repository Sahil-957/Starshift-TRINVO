"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { signInByEmail, signInByIp } from "@/core/ratelimit";

export type SignInState = { error: string | null; email: string };

export async function signInAction(_: SignInState, form: FormData): Promise<SignInState> {
  const email = String(form.get("email") ?? "");
  const account = email.trim().toLowerCase();
  // the reverse proxy (Caddy) sets X-Forwarded-For; first entry is the visitor
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (signInByEmail.blocked(account) || signInByIp.blocked(ip)) {
    return { error: "Too many attempts. Wait 15 minutes and try again.", email };
  }
  try {
    await signIn("credentials", { email, password: form.get("password"), redirectTo: "/" });
    return { error: null, email };
  } catch (e) {
    // the success path throws a redirect, which must propagate
    if (e instanceof AuthError) {
      signInByEmail.fail(account);
      signInByIp.fail(ip);
      return { error: "Email or password is incorrect.", email };
    }
    signInByEmail.clear(account);
    throw e;
  }
}
