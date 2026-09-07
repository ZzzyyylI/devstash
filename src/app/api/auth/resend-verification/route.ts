import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/base-url";
import { resendVerificationSchema } from "@/lib/validations/auth";
import {
  createVerificationToken,
  latestVerificationToken,
  RESEND_DEBOUNCE_MS,
} from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";
import { emailVerificationEnabled } from "@/lib/auth-flags";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import {
  INVALID_JSON,
  invalidJsonResponse,
  readJsonBody,
  validationErrorResponse,
} from "@/lib/api/request";

const TTL_MS = 24 * 60 * 60 * 1000;

/**
 * POST /api/auth/resend-verification  { email }
 *
 * Re-sends the verification link. Always responds `{ success: true }` 200
 * regardless of whether the email is registered or already verified, so it
 * can't be used to probe for accounts. A short per-email debounce stops the
 * endpoint from being turned into a mail relay.
 */
export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (body === INVALID_JSON) return invalidJsonResponse();

  const parsed = resendVerificationSchema.safeParse(body);
  if (!parsed.success) {
    return validationErrorResponse(
      parsed.error,
      "Enter a valid email address",
      false,
    );
  }

  const { email } = parsed.data;

  const limit = await checkRateLimit({
    request,
    name: "auth:resend-verification",
    limit: 3,
    window: "15 m",
    identifier: email,
  });
  if (!limit.success) return rateLimitResponse(limit.reset);

  // Verification disabled: there's nothing to resend. Keep the same always-200
  // shape so the client needs no special-casing.
  if (!emailVerificationEnabled()) {
    return NextResponse.json({ success: true });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (user && !user.emailVerified) {
    const recent = await latestVerificationToken(email);
    const mintedAgo = recent
      ? TTL_MS - (recent.expires.getTime() - Date.now())
      : Infinity;

    if (mintedAgo >= RESEND_DEBOUNCE_MS) {
      try {
        const token = await createVerificationToken(email);
        const verifyUrl = `${getBaseUrl(request)}/api/auth/verify-email?token=${token}`;
        await sendVerificationEmail(email, verifyUrl);
      } catch (mailError) {
        console.error("Resend verification email failed:", mailError);
      }
    }
  }

  return NextResponse.json({ success: true });
}
