import NextAuth from "next-auth";

import authConfig from "@/auth.config";

// Lightweight Auth.js instance built from the edge-safe config only — no Prisma
// adapter, no `pg`. This is why `auth.ts` forces `session.strategy = "jwt"`:
// here the session can only come from the token.
const { auth } = NextAuth(authConfig);

/**
 * Route protection. Unauthenticated requests to matched paths are bounced to the
 * custom sign-in page with a `callbackUrl` so the user lands back where they
 * were headed after signing in.
 */
export const proxy = auth((req) => {
  if (!req.auth) {
    const signInUrl = new URL("/sign-in", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.href);
    return Response.redirect(signInUrl);
  }
});

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/profile",
    "/profile/:path*",
    "/settings",
    "/settings/:path*",
  ],
};
