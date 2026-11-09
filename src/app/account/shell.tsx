/** The narrow centred column the account forms sit in. */
export default function Shell({ title, lede, children }: { title: string; lede?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-5 py-16 sm:px-0 sm:py-24">
      <h1 className="display text-[clamp(2.25rem,6vw,3.25rem)] text-chalk">{title}</h1>
      {lede && <p className="mt-4 text-[15px] leading-relaxed text-ash">{lede}</p>}
      <div className="mt-10">{children}</div>
    </div>
  );
}
