import type { NextRequest } from "next/server";

import { handlers } from "@/auth";
import {
  checkRateLimit,
  credentialsRateLimitResponse,
} from "@/lib/rate-limit";

// Auth.js catch-all route — serves sign-in, callback, sign-out, session, etc.
export const { GET } = handlers;

/**
 * `POST` is wrapped (rather than re-exported directly) so email/password
 * sign-ins can be rate limited: 5 attempts per 15 min, keyed by IP + the
 * submitted email. Auth.js owns `/api/auth/callback/credentials`, so this is
 * the only place to intercept it. Every other POST path is passed straight
 * through.
 */
export async function POST(request: NextRequest): Promise<Response> {
  if (new URL(request.url).pathname.endsWith("/callback/credentials")) {
    let email: string | undefined;
    try {
      // Clone so the body stream is still intact for the real handler.
      const form = await request.clone().formData();
      const value = form.get("email");
      if (typeof value === "string" && value) email = value;
    } catch {
      // Not form-encoded / unreadable — fall back to IP-only keying.
    }

    const limit = await checkRateLimit({
      request,
      name: "auth:login",
      limit: 5,
      window: "15 m",
      identifier: email,
    });
    if (!limit.success) {
      return credentialsRateLimitResponse(request, limit.reset);
    }
  }

  return handlers.POST(request);
}
