import GitHub from "next-auth/providers/github";
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
 */
export default {
  providers: [GitHub],
} satisfies NextAuthConfig;
