import Stripe from "stripe";

/**
 * Stripe SDK singleton for DevStash Pro subscription billing.
 *
 * Mirrors `getRedis()` in `src/lib/rate-limit.ts`: it **fails soft**. If
 * `STRIPE_SECRET_KEY` isn't set, `getStripe()` returns `null` (and warns once)
 * rather than throwing, so the Phase 2 checkout / webhook endpoints can answer
 * `503` and nothing else in the app breaks.
 *
 * All keys are server-only — never expose them with a `NEXT_PUBLIC_` prefix.
 */

// `undefined` = not yet resolved; `null` = resolved, no secret key (disabled).
let stripe: Stripe | null | undefined;

/**
 * The configured Stripe client, or `null` when `STRIPE_SECRET_KEY` is unset.
 * Resolved once and reused; the "not configured" warning is logged a single time.
 */
export function getStripe(): Stripe | null {
  if (stripe !== undefined) return stripe;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  // Pin to the API version this SDK build was generated against (stripe v22
  // exposes it as `Stripe.API_VERSION`), so an account-level default change in
  // the Dashboard can't shift response shapes under us.
  stripe = secretKey
    ? new Stripe(secretKey, { apiVersion: Stripe.API_VERSION })
    : null;

  if (!stripe) {
    console.warn(
      "[stripe] STRIPE_SECRET_KEY not set — subscription billing is disabled.",
    );
  }
  return stripe;
}

/**
 * `true` when both the secret key and the webhook signing secret are present —
 * i.e. billing can run end to end (checkout **and** the webhook that syncs the
 * subscription back). Phase 2 endpoints use this for their `503` guard.
 */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}
