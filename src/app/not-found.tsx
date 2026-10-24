import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-[1500px] flex-col justify-center px-5 py-24 sm:px-8">
      <span className="label text-bronze">404</span>
      <h1 className="display mt-8 text-[clamp(2.75rem,9vw,6rem)] text-chalk">
        Nothing here
      </h1>
      <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ash">
        That page does not exist — it may have moved with the rest of the
        catalogue.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/"
          className="label bg-chalk px-8 py-4 text-void transition-colors hover:bg-bronze"
        >
          Back home
        </Link>
        <Link
          href="/shop"
          className="label border hairline px-8 py-4 text-chalk transition-colors hover:bg-chalk hover:text-void"
        >
          See the range
        </Link>
      </div>
    </section>
  );
}
