import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Add the user id to the session. Populated from the JWT in the `session`
   * callback in `src/auth.ts`.
   */
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
