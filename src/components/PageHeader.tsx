export default function PageHeader({
  index,
  label,
  title,
  lede,
}: {
  index: string;
  label: string;
  title: string;
  lede?: string;
}) {
  return (
    <header className="mx-auto max-w-[1500px] px-5 pb-12 pt-12 sm:px-8 lg:pb-16 lg:pt-16">
      <div className="flex items-baseline justify-between gap-6 border-b hairline pb-5">
        <span className="label text-dim">
          {index} — {label}
        </span>
      </div>
      <h1 className="display mt-10 max-w-[13ch] text-[clamp(2.6rem,8vw,6rem)] text-chalk">
        {title}
      </h1>
      {lede && (
        <p className="mt-7 max-w-lg text-[15px] leading-relaxed text-ash">
          {lede}
        </p>
      )}
    </header>
  );
}
