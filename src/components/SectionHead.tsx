import Reveal from "./Reveal";

type Props = {
  /** Two-digit section marker, e.g. "02" */
  index: string;
  label: string;
  title: string;
  lede?: string;
  /** Rendered on the right of the rule, e.g. a link */
  aside?: React.ReactNode;
  /** CSS colour for the marker and the lit segment of the rule */
  accent?: string;
};

export default function SectionHead({
  index,
  label,
  title,
  lede,
  aside,
  accent = "var(--color-cobalt)",
}: Props) {
  return (
    <Reveal>
      <div className="relative flex items-baseline justify-between gap-6 border-b hairline pb-5">
        <span className="label" style={{ color: accent }}>
          {index} — {label}
        </span>
        {aside}
        <span
          aria-hidden="true"
          className="absolute -bottom-px left-0 h-px w-16"
          style={{ backgroundColor: accent }}
        />
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
        <h2 className="display max-w-[14ch] text-[clamp(2.4rem,7vw,5.5rem)] text-chalk">
          {title}
        </h2>
        {lede && (
          <p className="max-w-md self-end text-[15px] leading-relaxed text-ash">
            {lede}
          </p>
        )}
      </div>
    </Reveal>
  );
}
