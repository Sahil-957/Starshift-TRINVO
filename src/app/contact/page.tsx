import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Contact",
  description: "Reach TINVO about orders, bulk enquiries and custom print.",
};

const routes = [
  {
    label: "General & orders",
    value: "starshift07@gmail.com",
    note: "Anything about the range, sizing or shipping.",
  },
  {
    label: "Bulk & corporate",
    value: "starshift07@gmail.com",
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
        lede="Questions about an order, a design or a bulk quote? Email us. A person reads every message, and we reply from the same inbox your order emails come from."
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
      </section>
    </>
  );
}
