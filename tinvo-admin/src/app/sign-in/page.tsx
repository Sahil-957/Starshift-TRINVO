import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SignInForm from "./form";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage() {
  if ((await auth())?.user) redirect("/");
  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center px-5">
      <p className="label text-dim">TINVO · Admin</p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Sign in</h1>
      <SignInForm />
    </main>
  );
}
