import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { changePasswordSchema } from "@/lib/validations/auth";
import {
  INVALID_JSON,
  invalidJsonResponse,
  readJsonBody,
  validationErrorResponse,
} from "@/lib/api/request";

/**
 * POST /api/auth/change-password  { currentPassword, newPassword, confirmPassword }
 *
 * Signed-in email/password users only. Re-verifies the current password with
 * bcrypt before writing the new hash (12 rounds, matching register/reset).
 * GitHub-only accounts have no `password` and get a 400.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const body = await readJsonBody(request);
  if (body === INVALID_JSON) return invalidJsonResponse();

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error, "Invalid password details");
  }

  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, password: true },
  });
  if (!user?.password) {
    return NextResponse.json(
      { success: false, error: "This account doesn't use a password to sign in." },
      { status: 400 },
    );
  }

  const matches = await verifyPassword(currentPassword, user.password);
  if (!matches) {
    return NextResponse.json(
      { success: false, error: "Current password is incorrect." },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: passwordHash },
  });

  return NextResponse.json({ success: true });
}
