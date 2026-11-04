"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type SignInState = { error: string | null; email: string };

export async function signInAction(_: SignInState, form: FormData): Promise<SignInState> {
  const email = String(form.get("email") ?? "");
  try {
    await signIn("credentials", { email, password: form.get("password"), redirectTo: "/" });
    return { error: null, email };
  } catch (e) {
    // the success path throws a redirect, which must propagate
    if (e instanceof AuthError) return { error: "Email or password is incorrect.", email };
    throw e;
  }
}
