import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Contact",
  description: "Reach TRINVO about orders, bulk enquiries and custom print.",
};

const routes = [
  {
    label: "General & orders",
    value: "hello@trinvo.store",
    note: "Anything about the range, sizing or shipping.",
  },
  {
    label: "Bulk & corporate",
    value: "studio@trinvo.store",
    note: "Team gifting and larger orders from the existing range.",
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHeader
        index="01"
        label="Contact"
        title="Talk to a person"
        lede="The store is not live yet, so the fastest route is still email. We read everything."
      />

      <section className="mx-auto max-w-[1500px] px-5 pb-24 sm:px-8 lg:pb-32">
        <ul className="grid gap-px border hairline bg-chalk/10 sm:grid-cols-2">
          {routes.map((route) => (
            <li key={route.label} className="bg-void p-8 sm:p-10">
              <h2 className="label text-dim">{route.label}</h2>
              <a
                href={`mailto:${route.value}`}
                className="wipe mt-5 inline-block text-[clamp(1.2rem,2.6vw,1.75rem)] text-chalk"
              >
                {route.value}
              </a>
              <p className="mt-5 text-[15px] leading-relaxed text-ash">
                {route.note}
              </p>
            </li>
          ))}
        </ul>

        <p className="mt-10 max-w-xl text-[13px] leading-relaxed text-dim">
          Addresses above are placeholders for the storefront build — swap them
          for the live inboxes before launch.
        </p>
      </section>
    </>
  );
}
