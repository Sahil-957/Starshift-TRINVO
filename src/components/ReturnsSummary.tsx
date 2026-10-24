import Link from "next/link";
import { getPolicy } from "@/data/policy";

/**
 * Short returns notice for a product detail page. Reads from the fulfilment
 * policy rather than hard-coded copy, so a product made by a different
 * provider states that provider's terms — and so a warranty is only ever
 * mentioned once one has actually been confirmed.
 */
export default function ReturnsSummary({
  fulfilment,
}: {
  fulfilment?: string;
}) {
  const policy = getPolicy(fulfilment);

  return (
    <section className="mt-12 border-t hairline pt-8">
      <h2 className="label text-dim">Returns &amp; product issues</h2>

      <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-ash">
        Received a damaged, defective, misprinted or incorrect item? Contact us
        within {policy.reportWindowDays} days of delivery with photographs and
        an unboxing video. Claims are reviewed and verified before a refund or
        replacement is approved.
      </p>
      <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ash">
        This tumbler is printed to order, so change-of-mind returns are
        generally not available — subject to your rights under applicable
        consumer law.
        {policy.warranty === null &&
          " No additional commercial warranty has been confirmed for this product."}
      </p>

      <Link
        href="/support/returns"
        className="wipe label mt-6 inline-block text-chalk"
      >
        Read the return &amp; refund policy &rarr;
      </Link>
    </section>
  );
}
