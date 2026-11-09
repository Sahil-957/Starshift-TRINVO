"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { accountCall, clearSession, safeNext, setSession } from "@/lib/account";
import { tooMany } from "@/lib/limit";

export type FormState = { error?: string; ok?: string };

const v = (f: FormData, k: string) => String(f.get(k) ?? "");
const slow = "Too many attempts. Please wait a few minutes and try again.";
const limited = async (name: string, max: number, who?: string) => !!tooMany({ headers: await headers() }, name, max, 10 * 60_000, who);
const down = { error: "We couldn't reach our servers. Please try again in a minute." };

/** Calls the admin; returns its data, or an error message for the form. */
async function call(action: string, body: Record<string, unknown> = {}): Promise<{ error?: string; data?: { session: string } }> {
  try {
    const r = await accountCall(action, body);
    return r.ok ? { data: r.data } : { error: (r.data.error as string) ?? down.error };
  } catch {
    return down;
  }
}

export async function signInAction(_: FormState, f: FormData): Promise<FormState> {
  const email = v(f, "email").trim().toLowerCase();
  if ((await limited("sign-in", 10)) || (await limited("sign-in-email", 10, email))) return { error: slow };
  const r = await call("sign-in", { email, password: v(f, "password") });
  if (r.error) return { error: r.error };
  await setSession(r.data!.session);
  redirect(safeNext(v(f, "next")));
}

export async function signUpAction(_: FormState, f: FormData): Promise<FormState> {
  if (await limited("sign-up", 5)) return { error: slow };
  const r = await call("sign-up", { name: v(f, "name"), email: v(f, "email"), password: v(f, "password") });
  if (r.error) return { error: r.error };
  await setSession(r.data!.session);
  redirect(safeNext(v(f, "next")));
}

export async function forgotAction(_: FormState, f: FormData): Promise<FormState> {
  if (await limited("forgot", 5)) return { error: slow };
  const r = await call("forgot", { email: v(f, "email") });
  return r.error ? { error: r.error } : { ok: "If there's an account with that email, a reset link is on its way. Check your inbox (and spam)." };
}

export async function resetAction(_: FormState, f: FormData): Promise<FormState> {
  if (await limited("reset", 10)) return { error: slow };
  const r = await call("reset", { token: v(f, "token"), password: v(f, "password") });
  if (r.error) return { error: r.error };
  await setSession(r.data!.session);
  redirect("/account?reset=1");
}

export async function changePasswordAction(_: FormState, f: FormData): Promise<FormState> {
  if (await limited("change-password", 10)) return { error: slow };
  const r = await call("change-password", { current: v(f, "current"), password: v(f, "password") });
  if (r.error) return { error: r.error };
  await setSession(r.data!.session);
  return { ok: "Password changed. Other devices have been signed out." };
}

export async function resendVerifyAction(): Promise<FormState> {
  if (await limited("resend-verify", 3)) return { error: slow };
  const r = await call("resend-verify");
  return r.error ? { error: r.error } : { ok: "Sent. Check your inbox (and spam)." };
}

export async function signOutAction() {
  await call("sign-out");
  await clearSession();
  redirect("/");
}
