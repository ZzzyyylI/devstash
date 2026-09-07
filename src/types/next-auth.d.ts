import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Add the user id and Pro flag to the session. `id` is populated from the JWT
   * in the `session` callback in `src/auth.ts`; `isPro` is re-synced from the DB
   * in the `jwt` callback on every `auth()` call so a webhook-driven change is
   * picked up on the next request.
   */
  interface Session {
    user: {
      id: string;
      isPro: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    isPro?: boolean;
  }
}
