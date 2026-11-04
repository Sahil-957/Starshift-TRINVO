import type { Metadata } from "next";
import ActionForm, { Field } from "../../../action-form";
import { addMemberAction, removeMemberAction } from "../actions";
import { requireShop } from "@/core/session";
import { listTeam } from "@/core/team";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage({ params }: PageProps<"/s/[shopId]/team">) {
  const { shopId } = await params;
  const { role } = await requireShop(shopId, "view");
  const { orgPeople, shopPeople } = await listTeam(shopId);
  const isAdmin = role === "owner" || role === "admin";

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_24rem]">
      <div className="grid content-start gap-8">
        <section>
          <h2 className="label text-ash">Organisation · every shop</h2>
          <ul className="mt-3 border-t hairline">
            {orgPeople.map((p) => (
              <li key={p.id} className="flex items-center gap-4 border-b hairline py-3 text-[14px]">
                <span className="flex-1">{p.name}</span>
                <span className="text-ash">{p.email}</span>
                <span className="label w-20 text-right text-dim">{p.role}</span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="label text-ash">This shop only</h2>
          {shopPeople.length === 0 ? (
            <p className="mt-3 text-[14px] text-dim">No shop-only members yet.</p>
          ) : (
            <ul className="mt-3 border-t hairline">
              {shopPeople.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-4 border-b hairline py-3 text-[14px]">
                  <span className="flex-1">{p.name}</span>
                  <span className="text-ash">{p.email}</span>
                  <span className="label w-20 text-right text-dim">{p.role}</span>
                  {isAdmin && (
                    <ActionForm
                      action={removeMemberAction.bind(null, shopId, p.id)}
                      submit="Remove"
                      tone="quiet"
                      confirm={`Remove ${p.name} from this shop?`}
                      className="flex items-center gap-2"
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        <p className="text-[13px] text-dim">
          Managers can edit products, settings and orders here. Staff can view only. Refunds, payment keys and tokens
          need an organisation owner or admin.
        </p>
      </div>

      {isAdmin && (
        <section className="border hairline p-6">
          <h2 className="label text-ash">Add someone</h2>
          <ActionForm action={addMemberAction.bind(null, shopId)} submit="Add to shop" className="mt-5 grid gap-4">
            <Field label="Email">
              <input name="email" type="email" required className="field" />
            </Field>
            <Field label="Role">
              <select name="role" defaultValue="staff" className="field bg-void">
                <option value="staff">Staff (view only)</option>
                <option value="manager">Manager</option>
              </select>
            </Field>
            <Field label="Name" hint="Only for a new account">
              <input name="name" className="field" />
            </Field>
            <Field label="Initial password" hint="Only for a new account; 12+ characters. Share it privately.">
              <input name="password" type="password" autoComplete="new-password" className="field" />
            </Field>
          </ActionForm>
        </section>
      )}
    </div>
  );
}
