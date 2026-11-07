"use client";

import { useActionState } from "react";
import { createShopAction } from "./actions";

export default function NewShopForm({ orgId }: { orgId: string }) {
  const [error, action, pending] = useActionState(createShopAction, null);
  return (
    <form action={action} className="mt-10 grid max-w-lg gap-6">
      <input type="hidden" name="orgId" value={orgId} />
      <label className="grid gap-2">
        <span className="label text-dim">Shop name</span>
        <input name="name" required maxLength={80} placeholder="TINVO" className="field" />
      </label>
      <label className="grid gap-2">
        <span className="label text-dim">Slug</span>
        <input name="slug" required maxLength={40} placeholder="tinvo" className="field" />
        <span className="text-[13px] text-dim">Lowercase letters, numbers and hyphens. Unique in your organisation.</span>
      </label>
      <label className="grid gap-2">
        <span className="label text-dim">Settlement currency</span>
        <input name="settlementCurrency" required defaultValue="INR" maxLength={3} className="field uppercase" />
        <span className="text-[13px] text-dim">What your payment gateway pays out in. PayU settles in INR.</span>
      </label>
      {error && (
        <p role="alert" className="text-[14px] text-rose">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className="button justify-self-start">
        {pending ? "Creating…" : "Create shop"}
      </button>
    </form>
  );
}
