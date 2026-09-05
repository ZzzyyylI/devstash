import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";
import { getBaseUrl } from "@/lib/base-url";
import { createVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";

/**
 * POST /api/auth/register
 *
 * Public endpoint that creates an email/password user. Kept as an API route
 * (not a Server Action) because it needs specific HTTP status codes and may
 * later serve non-web clients. The password is hashed with bcryptjs before it
 * touches the database; the Credentials provider in `src/auth.ts` verifies
 * against the same hash on sign-in.
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

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid registration details",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { success: false, error: "An account with that email already exists" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.user.create({
      data: { name, email, password: passwordHash },
      select: { id: true, name: true, email: true },
    });

    // Fire the verification email. A failure here must not fail registration —
    // the account exists and the user can request a fresh link from /sign-in.
    try {
      const token = await createVerificationToken(email);
      const verifyUrl = `${getBaseUrl(request)}/api/auth/verify-email?token=${token}`;
      await sendVerificationEmail(email, verifyUrl);
    } catch (mailError) {
      console.error("Verification email failed to send:", mailError);
    }

    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error) {
    // Unique-constraint race between the check above and the insert.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { success: false, error: "An account with that email already exists" },
        { status: 409 },
      );
    }

    console.error("Registration failed:", error);
    return NextResponse.json(
      { success: false, error: "Could not create account" },
      { status: 500 },
    );
  }
}
