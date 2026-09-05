import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/base-url";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import {
  createPasswordResetToken,
  latestPasswordResetToken,
  RESEND_DEBOUNCE_MS,
} from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const TTL_MS = 24 * 60 * 60 * 1000;

/**
 * POST /api/auth/forgot-password  { email }
 *
 * Starts a password reset. Always responds `{ success: true }` 200 regardless
 * of whether the email is registered, so it can't be used to probe for
 * accounts. A reset link is only sent when the address maps to a real user with
 * a password set (GitHub-only accounts have nothing to reset). A short
 * per-email debounce stops the endpoint from being turned into a mail relay.
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

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Enter a valid email address" },
      { status: 400 },
    );
  }

  const limit = await checkRateLimit({
    request,
    name: "auth:forgot-password",
    limit: 3,
    window: "1 h",
  });
  if (!limit.success) return rateLimitResponse(limit.reset);

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (user?.password) {
    const recent = await latestPasswordResetToken(email);
    const mintedAgo = recent
      ? TTL_MS - (recent.expires.getTime() - Date.now())
      : Infinity;

    if (mintedAgo >= RESEND_DEBOUNCE_MS) {
      try {
        const token = await createPasswordResetToken(email);
        const resetUrl = `${getBaseUrl(request)}/reset-password?token=${token}`;
        await sendPasswordResetEmail(email, resetUrl);
      } catch (mailError) {
        console.error("Password reset email failed to send:", mailError);
      }
    }
  }

  return NextResponse.json({ success: true });
}
