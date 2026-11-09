"use client";

import { createContext, startTransition, useActionState, useContext, useId, useState } from "react";
import type { FormState } from "./actions";

export const input =
  "w-full border hairline bg-transparent px-4 py-3.5 text-[15px] text-chalk outline-none transition-colors placeholder:text-dim focus:border-chalk aria-[invalid=true]:border-rose";

/** The form's last answer, so each field can show its own error. */
const Result = createContext<FormState>({});

/** The error for one field, hidden again as soon as the shopper edits it. */
function useFieldError(name?: string) {
  const state = useContext(Result);
  const [editedAfter, setEditedAfter] = useState<FormState | null>(null);
  const error = name && state.field === name && editedAfter !== state ? state.error : undefined;
  return { error, edited: () => setEditedAfter(state) };
}

function Shell({ label, hint, error, id, children, aside }: { label: string; hint?: string; error?: string; id: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="label text-dim">
          {label}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p id={`${id}-msg`} role="alert" className="text-[13px] text-rose">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-msg`} className="text-[13px] text-dim">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

type InputProps = { label: string; hint?: string; aside?: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>;

export function Field({ label, hint, aside, name, onChange, ...props }: InputProps) {
  const id = useId();
  const { error, edited } = useFieldError(name);
  return (
    <Shell label={label} hint={hint} error={error} id={id} aside={aside}>
      <input
        id={id}
        name={name}
        className={input}
        aria-invalid={!!error}
        aria-describedby={error || hint ? `${id}-msg` : undefined}
        onChange={(e) => {
          edited();
          onChange?.(e);
        }}
        {...props}
      />
    </Shell>
  );
}

/** 0–4, from length and variety. A guide only; the server refuses passwords from known leaks. */
function strength(p: string) {
  if (p.length < 8) return p ? 1 : 0;
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(p)).length;
  return Math.min(4, 1 + (p.length >= 12 ? 1 : 0) + (kinds >= 2 ? 1 : 0) + (kinds >= 3 || p.length >= 16 ? 1 : 0));
}
const levels = ["", "Too short", "Okay", "Good", "Strong"];
const colours = ["", "bg-rose", "bg-bronze", "bg-jade/70", "bg-jade"];

/** Password with show/hide, a caps-lock warning and, for new passwords, a strength bar. */
export function PasswordField({ label, hint, aside, name, meter, ...props }: InputProps & { meter?: boolean }) {
  const id = useId();
  const { error, edited } = useFieldError(name);
  const [shown, setShown] = useState(false);
  const [caps, setCaps] = useState(false);
  const [value, setValue] = useState("");
  const s = strength(value);
  return (
    <Shell label={label} hint={hint} error={error} id={id} aside={aside}>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={shown ? "text" : "password"}
          className={`${input} pr-20`}
          aria-invalid={!!error}
          aria-describedby={error || hint ? `${id}-msg` : undefined}
          onChange={(e) => {
            edited();
            setValue(e.target.value);
          }}
          onKeyUp={(e) => setCaps(e.getModifierState?.("CapsLock") ?? false)}
          onBlur={() => setCaps(false)}
          autoCapitalize="none"
          spellCheck={false}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          className="label absolute inset-y-0 right-0 px-4 text-dim transition-colors hover:text-chalk"
        >
          {shown ? "Hide" : "Show"}
        </button>
      </div>
      {caps && <p className="text-[13px] text-bronze">Caps Lock is on.</p>}
      {meter && value && (
        <div className="flex items-center gap-3" aria-live="polite">
          <div className="grid flex-1 grid-cols-4 gap-1">
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className={`h-1 ${i <= s ? colours[s] : "bg-chalk/10"}`} />
            ))}
          </div>
          <span className="label w-16 text-right text-[10px] text-dim">{levels[s]}</span>
        </div>
      )}
    </Shell>
  );
}

/** A form bound to a server action, with field errors, a general message and a busy submit button. */
export function AccountForm({
  action,
  submit,
  busy,
  children,
  quiet,
  wide,
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  submit: string;
  busy: string;
  children?: React.ReactNode;
  quiet?: boolean;
  wide?: boolean;
}) {
  const [state, run, pending] = useActionState(action, {});
  return (
    <Result.Provider value={state}>
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
        {state.error && !state.field && (
          <p role="alert" className="border border-rose/40 bg-rose/5 px-4 py-3 text-[14px] text-chalk">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p role="status" className="border border-jade/40 bg-jade/5 px-4 py-3 text-[14px] text-chalk">
            {state.ok}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className={`label flex items-center justify-center gap-3 px-8 py-4 transition-colors disabled:opacity-60 ${wide ? "w-full" : "justify-self-start"} ${
            quiet ? "border hairline text-chalk hover:bg-chalk hover:text-void" : "bg-chalk text-void hover:bg-bronze"
          }`}
        >
          {pending && <span aria-hidden className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />}
          {pending ? busy : submit}
        </button>
      </form>
    </Result.Provider>
  );
}
