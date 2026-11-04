import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { verifyLogin } from "./core/users.ts";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

const login = z.object({ email: z.email(), password: z.string().min(1).max(200) });

// Email + password only, so sessions are signed JWT cookies and no adapter tables
// are needed. ponytail: no sign-in rate limit yet; add one (Upstash or a
// failed_logins table) before the admin is on a public domain.
export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: { signIn: "/sign-in" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (raw) => {
        const parsed = login.safeParse(raw);
        if (!parsed.success) return null;
        const user = await verifyLogin(parsed.data.email, parsed.data.password);
        return user ? { id: user.id, email: user.email, name: user.name } : null;
      },
    }),
  ],
  callbacks: {
    session({ session, token }) {
      session.user.id = token.sub!;
      return session;
    },
  },
});
