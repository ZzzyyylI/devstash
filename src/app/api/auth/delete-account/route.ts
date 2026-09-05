import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteAccountSchema } from "@/lib/validations/auth";

/**
 * POST /api/auth/delete-account  { confirmation }
 *
 * Signed-in user only. `confirmation` must match the account's own email.
 * Deleting the `User` row cascades to items, collections, tags, custom item
 * types, and auth accounts/sessions via the FK `ON DELETE CASCADE` constraints
 * (see prisma/schema.prisma). `VerificationToken` has no relation, so any
 * pending tokens for this address are cleared explicitly.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = deleteAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Type your email address to confirm." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true },
  });
  if (!user) {
    // Session outlived the account — nothing left to delete.
    return NextResponse.json({ success: true });
  }

  if (
    parsed.data.confirmation.trim().toLowerCase() !== user.email.toLowerCase()
  ) {
    return NextResponse.json(
      { success: false, error: "That doesn't match your email address." },
      { status: 400 },
    );
  }

  await prisma.user.delete({ where: { id: user.id } });
  await prisma.verificationToken.deleteMany({
    where: { identifier: { in: [user.email, `pwreset:${user.email}`] } },
  });

  return NextResponse.json({ success: true });
}
