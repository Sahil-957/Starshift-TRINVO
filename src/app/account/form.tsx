"use client";

import { startTransition, useActionState } from "react";
import type { FormState } from "./actions";

export const input = "w-full border hairline bg-transparent px-4 py-3 text-[15px] text-chalk outline-none focus:border-chalk";

export function Field({ label, hint, ...props }: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="grid gap-2">
      <span className="label text-dim">{label}</span>
      <input className={input} {...props} />
      {hint && <span className="text-[13px] text-dim">{hint}</span>}
    </label>
  );
}

/** A form bound to a server action, with its error/success line and a busy submit button. */
export function AccountForm({
  action,
  submit,
  busy,
  children,
  quiet,
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  submit: string;
  busy: string;
  children?: React.ReactNode;
  quiet?: boolean;
}) {
  const [state, run, pending] = useActionState(action, {});
  return (
    <form
      // submitted by hand rather than action={run}, which empties every field on an error
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => run(data));
      }}
      className="grid gap-5"
    >
      {children}
      {state.error && (
        <p role="alert" className="text-[14px] text-rose">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p role="status" className="text-[14px] text-jade">
          {state.ok}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className={`label justify-self-start px-8 py-4 transition-colors disabled:opacity-60 ${
          quiet ? "border hairline text-chalk hover:bg-chalk hover:text-void" : "bg-chalk text-void hover:bg-bronze"
        }`}
      >
        {pending ? busy : submit}
      </button>
    </form>
  );
}
