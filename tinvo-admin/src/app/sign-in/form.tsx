"use client";

import { useActionState } from "react";
import { signInAction } from "./actions";

export default function SignInForm() {
  const [state, action, pending] = useActionState(signInAction, { error: null, email: "" });
  return (
    <form action={action} className="mt-10 grid gap-5">
      <label className="grid gap-2">
        <span className="label text-dim">Email</span>
        <input name="email" type="email" autoComplete="email" required defaultValue={state.email} className="field" />
      </label>
      <label className="grid gap-2">
        <span className="label text-dim">Password</span>
        <input name="password" type="password" autoComplete="current-password" required className="field" />
      </label>
      {state.error && (
        <p role="alert" className="text-[14px] text-rose">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="button mt-2">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
