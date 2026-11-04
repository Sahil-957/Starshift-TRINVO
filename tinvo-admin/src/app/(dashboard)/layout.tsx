import Link from "next/link";
import { signOut } from "@/auth";
import { shopsFor } from "@/core/access";
import { requireUser } from "@/core/session";
import ShopSwitcher from "./shop-switcher";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const shops = await shopsFor(user.id);

  return (
    <div className="min-h-svh">
      <header className="border-b hairline">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-4">
          <Link href="/" className="label text-chalk">
            TINVO · Admin
          </Link>
          <ShopSwitcher shops={shops} />
          <div className="ml-auto flex items-center gap-5">
            <span className="hidden text-[13px] text-dim sm:inline">{user.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/sign-in" });
              }}
            >
              <button type="submit" className="label text-ash hover:text-chalk">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10">{children}</main>
    </div>
  );
}
