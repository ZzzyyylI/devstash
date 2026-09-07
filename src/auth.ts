import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import authConfig from "@/auth.config";
import { signInSchema } from "@/lib/validations/auth";
import { emailVerificationEnabled } from "@/lib/auth-flags";

/**
 * Full Auth.js instance — import this everywhere in the app *except* the proxy.
 *
 * It combines the edge-safe `authConfig` (providers) with the Prisma adapter and
 * a JWT session strategy. JWT sessions are required by the split-config pattern:
 * the proxy runs Auth.js without the adapter, so it can only read the session
 * from the token, never the database.
 *
 * The Credentials provider from `authConfig` is a `authorize: () => null`
 * placeholder; here we map over the providers and replace it with the real
 * bcrypt-backed check (kept out of `auth.config.ts` so the edge bundle stays
 * free of `bcryptjs` and Prisma).
 */

/**
 * Thrown from `authorize` when the password is correct but the email has never
 * been verified. The `code` reaches the client as `signIn(...)`'s `code` field
 * so the sign-in form can show a "verify your email" message with a resend
 * action, instead of the generic "invalid credentials". It only fires *after* a
 * correct password, so it reveals nothing to someone who doesn't already have
 * the credentials.
 */
class UnverifiedEmailError extends CredentialsSignin {
  code = "unverified_email";
}
const providers = authConfig.providers.map((provider) => {
  if (typeof provider === "function") return provider;
  if (provider.id !== "credentials") return provider;

  return Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    authorize: async (credentials) => {
      const parsed = signInSchema.safeParse(credentials);
      if (!parsed.success) return null;

      const { email, password } = parsed.data;
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (!user?.password) return null;

      const passwordMatches = await verifyPassword(password, user.password);
      if (!passwordMatches) return null;

      if (emailVerificationEnabled() && !user.emailVerified) {
        throw new UnverifiedEmailError();
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      };
    },
  });
});

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  callbacks: {
    // Persist the user id onto the token, then re-sync `isPro` from the DB on
    // every call. The Pro flag is written by the Stripe webhook, which can't
    // reach an already-issued JWT — so an unconditional indexed `findUnique`
    // here is what makes a page reload after checkout reflect Pro. One extra
    // read per `auth()` call; acceptable for this app's traffic.
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { isPro: true },
        });
        token.isPro = dbUser?.isPro ?? false;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      session.user.isPro = Boolean(token.isPro);
      return session;
    },
  },
  ...authConfig,
  providers,
});
