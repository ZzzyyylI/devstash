import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting for the auth endpoints — brute force, credential stuffing, and
 * mail-relay abuse protection.
 *
 * Backed by Upstash Redis over its REST API (works on serverless/edge). It
 * **fails open**: if the Upstash credentials aren't configured, or Redis is
 * unreachable/slow, requests are allowed through rather than taking auth down.
 *
 * Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to enable it.
 */

/** `@upstash/ratelimit` window spec, e.g. `"15 m"`, `"1 h"`. */
type Duration = `${number} ${"ms" | "s" | "m" | "h" | "d"}`;

export interface RateLimitResult {
  /** `false` once the caller has exceeded the limit for the window. */
  success: boolean;
  /** Requests left in the current window. */
  remaining: number;
  /** Unix ms timestamp when the window resets. `0` when limiting is disabled. */
  reset: number;
}

// `undefined` = not yet resolved; `null` = resolved, no credentials (disabled).
let redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redis !== undefined) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;

  if (!redis) {
    console.warn(
      "[rate-limit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — auth rate limiting is disabled.",
    );
  }
  return redis;
}

// One `Ratelimit` instance per name+limit+window, reused across requests.
const limiters = new Map<string, Ratelimit>();

function getLimiter(
  name: string,
  limit: number,
  window: Duration,
): Ratelimit | null {
  const client = getRedis();
  if (!client) return null;

  const cacheKey = `${name}:${limit}:${window}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: client,
      limiter: Ratelimit.slidingWindow(limit, window),
      prefix: `ratelimit:${name}`,
      // Allow the request through if Redis doesn't answer within 1s.
      timeout: 1000,
      analytics: false,
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

/**
 * Best-effort client IP. Vercel sets `x-forwarded-for`; the first entry is the
 * original client. Falls back to `x-real-ip`, then a constant (which just means
 * every un-proxied caller shares one bucket — acceptable for local dev).
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip")?.trim() || "127.0.0.1";
}

export interface CheckRateLimitArgs {
  request: Request;
  /** Bucket namespace, e.g. `"auth:register"`. */
  name: string;
  limit: number;
  window: Duration;
  /**
   * Extra qualifier folded into the key alongside the IP (e.g. a submitted
   * email), for a tighter per-account limit. Lower-cased before use.
   */
  identifier?: string | null;
}

/**
 * Consume one slot from the `name` bucket for this caller. Never throws — on any
 * backend failure it returns `{ success: true }` (fail open).
 */
export async function checkRateLimit({
  request,
  name,
  limit,
  window,
  identifier,
}: CheckRateLimitArgs): Promise<RateLimitResult> {
  const limiter = getLimiter(name, limit, window);
  if (!limiter) return { success: true, remaining: limit, reset: 0 };

  const ip = getClientIp(request);
  const key = identifier ? `${ip}:${identifier.toLowerCase()}` : ip;

  try {
    const { success, remaining, reset } = await limiter.limit(key);
    return { success, remaining, reset };
  } catch (error) {
    console.error(
      `[rate-limit] check failed for "${name}" — allowing request:`,
      error,
    );
    return { success: true, remaining: limit, reset: 0 };
  }
}

/** Whole minutes until `reset`, floored at 1. */
function minutesUntil(reset: number): number {
  return Math.max(1, Math.ceil((reset - Date.now()) / 60_000));
}

function tooManyAttemptsMessage(reset: number): string {
  const minutes = minutesUntil(reset);
  return `Too many attempts. Please try again in ${minutes} ${
    minutes === 1 ? "minute" : "minutes"
  }.`;
}

/**
 * Standard `429` for a plain JSON API route: `{ error }` body plus a
 * `Retry-After` header (seconds).
 */
export function rateLimitResponse(reset: number): NextResponse {
  return NextResponse.json(
    { error: tooManyAttemptsMessage(reset) },
    {
      status: 429,
      headers: { "Retry-After": String(minutesUntil(reset) * 60) },
    },
  );
}

/**
 * `429` for the NextAuth credentials callback (`/api/auth/callback/credentials`).
 *
 * The client `signIn()` helper does `new URL(data.url)` on the response body
 * unconditionally, so the body must carry a `url` with `error`/`code` params —
 * the same channel `unverified_email` already travels. `SignInForm` reads
 * `code === "rate_limited"`. The JSON `error` and `Retry-After` header are still
 * there for non-browser callers.
 */
export function credentialsRateLimitResponse(
  request: Request,
  reset: number,
): NextResponse {
  const url = new URL("/sign-in", new URL(request.url).origin);
  url.searchParams.set("error", "CredentialsSignin");
  url.searchParams.set("code", "rate_limited");

  return NextResponse.json(
    { url: url.toString(), error: tooManyAttemptsMessage(reset) },
    {
      status: 429,
      headers: { "Retry-After": String(minutesUntil(reset) * 60) },
    },
  );
}
