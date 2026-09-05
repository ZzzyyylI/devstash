import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe slice of the Auth.js config.
 *
 * Only providers and adapter-free options live here so this object can be
 * imported into the proxy (and any other edge context) without pulling in the
 * Prisma adapter or the `pg` driver. The adapter and the `jwt` session strategy
 * are added in `src/auth.ts`.
 *
 * GitHub reads `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` from the environment
 * automatically.
 *
 * The Credentials provider here is a placeholder: `authorize` always returns
 * `null` so this file stays free of `bcryptjs` / Prisma (both unavailable on the
 * edge). `src/auth.ts` swaps in the real bcrypt-backed `authorize`.
 */
export default {
  // Custom auth UI (see `src/app/sign-in`), replacing the Auth.js default pages.
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    GitHub,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: () => null,
    }),
  ],
} satisfies NextAuthConfig;
