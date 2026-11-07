import { Field } from "../../../action-form";

type Defaults = {
  name?: string;
  slug?: string;
  tagline?: string;
  description?: string;
  status?: string;
  priceMinor?: number;
  compareAtMinor?: number | null;
  costMinor?: number | null;
  taxRateBps?: number;
  hsnCode?: string | null;
  supplierSku?: string | null;
  printTypeId?: string | null;
  designCode?: string | null;
  printFileKey?: string | null;
  printWidthIn?: string | null;
  printHeightIn?: string | null;
  mockupUrl?: string | null;
};

const rupees = (m?: number | null) => (m == null ? "" : String(m / 100));

/** The product form's fields, shared by "new" and "edit". */
export default function ProductFields({ p = {} }: { p?: Defaults }) {
  return (
    <>
      <fieldset className="grid gap-5 sm:grid-cols-2">
        <Field label="Name">
          <input name="name" required defaultValue={p.name} className="field" />
        </Field>
        <Field label="Slug" hint="Matches the storefront page: /shop/<slug>">
          <input name="slug" required defaultValue={p.slug} className="field" />
        </Field>
        <Field label="Tagline">
          <input name="tagline" defaultValue={p.tagline} maxLength={160} className="field" />
        </Field>
        <Field label="Status" hint="Only active products can be bought">
          <select name="status" defaultValue={p.status ?? "draft"} className="field bg-void">
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description">
            <textarea name="description" rows={4} defaultValue={p.description} className="field" />
          </Field>
        </div>
      </fieldset>

      <fieldset className="grid gap-5 border-t hairline pt-6 sm:grid-cols-3">
        <legend className="label mb-4 text-ash">Price and tax (₹, tax-inclusive)</legend>
        <Field label="Price">
          <input name="price" required inputMode="decimal" defaultValue={rupees(p.priceMinor)} className="field" />
        </Field>
        <Field label="Compare-at price" hint="Shown struck through">
          <input name="compareAt" inputMode="decimal" defaultValue={rupees(p.compareAtMinor)} className="field" />
        </Field>
        <Field label="Your cost" hint="What Qikink charges; for profit">
          <input name="cost" inputMode="decimal" defaultValue={rupees(p.costMinor)} className="field" />
        </Field>
        <Field label="GST rate %">
          <input name="taxRatePercent" inputMode="decimal" defaultValue={(p.taxRateBps ?? 1800) / 100} className="field" />
        </Field>
        <Field label="HSN code" hint="Confirm with your CA">
          <input name="hsnCode" defaultValue={p.hsnCode ?? ""} className="field" />
        </Field>
      </fieldset>

      <fieldset className="grid gap-5 border-t hairline pt-6">
        <legend className="label mb-4 text-ash">Fulfilment · Qikink</legend>
        <Field
          label="Qikink Store SKU"
          hint={<>Qikink → Products → My Products → ⋯ → Variations → <b>Store SKU</b> (starts with v-). Orders for this product go to Qikink with it.</>}
        >
          <input name="supplierSku" defaultValue={p.supplierSku ?? ""} placeholder="v-…" className="field font-mono text-[13px]" />
        </Field>

        <details className="border hairline p-5" open={Boolean(p.printFileKey)}>
          <summary className="label cursor-pointer text-dim">Advanced: send a print file instead of My Products</summary>
          <p className="mt-3 text-[13px] text-dim">
            Only for a design that is not in Qikink My Products. Leave all of these empty otherwise.
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            <Field label="Print type ID">
              <input name="printTypeId" defaultValue={p.printTypeId ?? ""} className="field" />
            </Field>
            <Field label="Design code" hint="Max 20 characters">
              <input name="designCode" maxLength={20} defaultValue={p.designCode ?? ""} className="field" />
            </Field>
            <div />
            <div className="sm:col-span-3">
              <Field label="Print file (private storage key)">
                <input name="printFileKey" defaultValue={p.printFileKey ?? ""} className="field font-mono text-[13px]" />
              </Field>
            </div>
            <Field label="Print width (in)">
              <input name="printWidthIn" defaultValue={p.printWidthIn ?? ""} className="field" />
            </Field>
            <Field label="Print height (in)">
              <input name="printHeightIn" defaultValue={p.printHeightIn ?? ""} className="field" />
            </Field>
            <div className="sm:col-span-3">
              <Field label="Mockup image URL" hint="A public image of the finished product">
                <input name="mockupUrl" type="url" defaultValue={p.mockupUrl ?? ""} className="field" />
              </Field>
            </div>
          </div>
        </details>
      </fieldset>
    </>
  );
}
