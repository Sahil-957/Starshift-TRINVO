import Image from "next/image";
import Link from "next/link";
import { googleEnabled } from "@/lib/google";

const perks = [
  ["Every order in one place", "Live status from printing to your door, with the courier's tracking link."],
  ["Checkout in seconds", "Your name, phone and address are filled in for you."],
  ["Reviews that count", "Review the designs you own, tied to your real order."],
];

const errors: Record<string, string> = {
  google: "Google sign-in didn't go through. Please try again, or use your email.",
  "google-cancelled": "Google sign-in was cancelled.",
};

/** Sign in / Create account: a picture panel on wide screens, tabs, Google, then email. */
export default function AuthLayout({
  mode,
  next,
  error,
  children,
}: {
  mode: "sign-in" | "sign-up";
  next: string;
  error?: string;
  children: React.ReactNode;
}) {
  const q = next !== "/account" ? `?next=${encodeURIComponent(next)}` : "";
  const tab = (m: typeof mode, label: string) => (
    <Link
      href={`/account/${m}${q}`}
      aria-current={mode === m ? "page" : undefined}
      className={`label flex-1 border-b-2 pb-4 text-center transition-colors ${mode === m ? "border-chalk text-chalk" : "border-chalk/10 text-dim hover:text-ash"}`}
    >
      {label}
    </Link>
  );

  return (
    <div className="mx-auto grid max-w-[1500px] lg:min-h-[calc(100svh-6rem)] lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden lg:block">
        <Image src="/products/chroma-tide-lifestyle.webp" alt="" fill priority sizes="50vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/55 to-void/10" />
        <div className="absolute inset-x-0 bottom-0 p-12 xl:p-16">
          <p className="label text-ash">Your TINVO account</p>
          <ul className="mt-8 grid max-w-md gap-6">
            {perks.map(([title, body]) => (
              <li key={title} className="border-l border-chalk/30 pl-5">
                <p className="text-[17px] text-chalk">{title}</p>
                <p className="mt-1 text-[14px] leading-relaxed text-ash">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="flex items-start justify-center px-5 py-12 sm:px-8 sm:py-16 lg:items-center">
        <div className="w-full max-w-[26rem]">
          <nav className="flex" aria-label="Account">
            {tab("sign-in", "Sign in")}
            {tab("sign-up", "Create account")}
          </nav>

          <h1 className="display mt-10 text-[clamp(2rem,5vw,2.75rem)] text-chalk">{mode === "sign-in" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ash">
            {mode === "sign-in"
              ? "Sign in to see your orders and check out faster."
              : "Every order you've placed with your email, past and future, in one place."}
          </p>

          {error && errors[error] && (
            <p role="alert" className="mt-6 border border-rose/40 bg-rose/5 px-4 py-3 text-[14px] text-chalk">
              {errors[error]}
            </p>
          )}

          {googleEnabled && (
            <>
              <a
                href={`/api/auth/google?next=${encodeURIComponent(next)}`}
                className="mt-8 flex w-full items-center justify-center gap-3 bg-white px-6 py-3.5 text-[15px] font-medium text-[#1f1f1f] transition-opacity hover:opacity-90"
              >
                <svg aria-hidden width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                Continue with Google
              </a>
              <div className="my-8 flex items-center gap-4" aria-hidden>
                <span className="h-px flex-1 bg-chalk/10" />
                <span className="label text-[10px] text-dim">or with email</span>
                <span className="h-px flex-1 bg-chalk/10" />
              </div>
            </>
          )}

          <div className={googleEnabled ? "" : "mt-8"}>{children}</div>

          <p className="mt-10 border-t hairline pt-6 text-[13px] leading-relaxed text-dim">
            {mode === "sign-up" && (
              <>
                By creating an account you agree to our{" "}
                <Link href="/support/terms" className="text-ash underline underline-offset-4 hover:text-chalk">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/support/privacy" className="text-ash underline underline-offset-4 hover:text-chalk">
                  Privacy policy
                </Link>
                . We only email you about your orders and account.{" "}
              </>
            )}
            Bought without an account?{" "}
            <Link href="/order" className="text-ash underline underline-offset-4 hover:text-chalk">
              Track an order
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
