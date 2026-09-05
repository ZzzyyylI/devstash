import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/base-url";
import { consumeVerificationToken } from "@/lib/tokens";

/**
 * GET /api/auth/verify-email?token=…
 *
 * Target of the link in the verification email. Consumes the token, stamps
 * `User.emailVerified`, and redirects to the sign-in page with a status flag.
 * Always redirects (never renders) so the URL the user lands on is clean.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const signIn = new URL("/sign-in", getBaseUrl(request));

  if (!token) {
    signIn.searchParams.set("error", "verification");
    return NextResponse.redirect(signIn);
  }

  const result = await consumeVerificationToken(token);
  if (!result) {
    signIn.searchParams.set("error", "verification");
    return NextResponse.redirect(signIn);
  }

  // `updateMany` so an unknown or already-verified email is a no-op, not a throw.
  await prisma.user.updateMany({
    where: { email: result.identifier, emailVerified: null },
    data: { emailVerified: new Date() },
  });

  signIn.searchParams.set("verified", "1");
  return NextResponse.redirect(signIn);
}
