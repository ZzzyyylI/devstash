import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { consumePasswordResetToken } from "@/lib/tokens";

/**
 * POST /api/auth/reset-password  { token, password, confirmPassword }
 *
 * Target of the reset link's form. Consumes the token, hashes the new password,
 * and writes it to the user. Since receiving the emailed link proves ownership
 * of the address, a still-unverified account is marked verified at the same
 * time. Errors are phrased around the token, never the account.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid reset details",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { token, password } = parsed.data;

  const result = await consumePasswordResetToken(token);
  if (!result) {
    return NextResponse.json(
      {
        success: false,
        error: "That reset link is invalid or has expired. Request a new one.",
      },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // `updateMany` so a since-deleted account is a no-op, not a throw. The token
  // was valid, so from the user's side the reset still "succeeded".
  await prisma.user.updateMany({
    where: { email: result.email },
    data: { password: passwordHash },
  });

  // Receiving the emailed link proves address ownership — verify it if it
  // wasn't already. Scoped to `emailVerified: null` so we don't overwrite an
  // existing timestamp.
  await prisma.user.updateMany({
    where: { email: result.email, emailVerified: null },
    data: { emailVerified: new Date() },
  });

  return NextResponse.json({ success: true });
}
