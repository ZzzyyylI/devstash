import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/prisma";
import authConfig from "@/auth.config";

/**
 * Full Auth.js instance — import this everywhere in the app *except* the proxy.
 *
 * It combines the edge-safe `authConfig` (providers) with the Prisma adapter and
 * a JWT session strategy. JWT sessions are required by the split-config pattern:
 * the proxy runs Auth.js without the adapter, so it can only read the session
 * from the token, never the database.
 */
export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  callbacks: {
    // Persist the user id onto the token, then expose it on the session so
    // server code can do `session.user.id` without a database round-trip.
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
  ...authConfig,
});
