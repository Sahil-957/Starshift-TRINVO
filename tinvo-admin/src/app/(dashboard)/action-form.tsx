"use client";

import { startTransition, useActionState } from "react";

export type FormState = { error?: string; ok?: string } | null;
type Action = (state: FormState, form: FormData) => Promise<FormState>;

/** A form bound to a server action, with its error/success line and a pending button. */
export default function ActionForm({
  action,
  submit,
  children,
  className = "grid gap-5",
  confirm,
  tone = "primary",
}: {
  action: Action;
  submit: string;
  children?: React.ReactNode;
  className?: string;
  /** asks before submitting, for refunds, archiving and the like */
  confirm?: string;
  tone?: "primary" | "quiet" | "danger";
}) {
  const [state, formAction, pending] = useActionState(action, null);
  // submitting through a transition (not form `action`) stops React clearing the
  // fields afterwards, so a validation error never wipes what was typed
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (confirm && !window.confirm(confirm)) return;
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };
  const button =
    tone === "primary"
      ? "button"
      : tone === "danger"
        ? "label border border-rose/60 px-5 py-3 text-rose hover:bg-rose/10"
        : "label border hairline px-5 py-3 text-ash hover:text-chalk";
  return (
    <form className={className} onSubmit={onSubmit}>
      {children}
      {state?.error && (
        <p role="alert" className="text-[14px] text-rose">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="break-all text-[14px] text-chalk">
          {state.ok}
        </p>
      )}
      <div>
        <button type="submit" disabled={pending} className={button}>
          {pending ? "Working…" : submit}
        </button>
      </div>
    </form>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="label text-dim">{label}</span>
      {children}
      {hint && <span className="text-[13px] text-dim">{hint}</span>}
    </label>
  );
}
