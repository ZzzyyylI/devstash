/**
 * DevStash plans, price-id mapping, and subscription-status helpers.
 *
 * Pure functions only — no Stripe SDK, no DB. The price ids are read from the
 * server-only env at call time (so tests can `vi.stubEnv` them).
 */

/** Recurring billing cadence for DevStash Pro. */
export type BillingInterval = "monthly" | "yearly";

/**
 * Per-plan usage caps. Free numbers mirror `context/project-overview.md` and the
 * homepage `FREE_FEATURES` copy; Pro is unlimited.
 */
export const PLAN_LIMITS = {
  free: { items: 50, collections: 3 },
  pro: { items: Infinity, collections: Infinity },
} as const;

/**
 * The Stripe Price id for a billing interval, or `null` when the corresponding
 * `STRIPE_PRICE_ID_*` env var is unset (e.g. local dev without billing).
 */
export function priceIdForInterval(interval: BillingInterval): string | null {
  const priceId =
    interval === "monthly"
      ? process.env.STRIPE_PRICE_ID_MONTHLY
      : process.env.STRIPE_PRICE_ID_YEARLY;
  return priceId || null;
}

/**
 * Reverse of {@link priceIdForInterval}: which interval a Price id belongs to,
 * or `null` if it matches neither configured price (or the env is unset).
 */
export function intervalForPriceId(priceId: string): BillingInterval | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_ID_MONTHLY) return "monthly";
  if (priceId === process.env.STRIPE_PRICE_ID_YEARLY) return "yearly";
  return null;
}

/**
 * Whether a Stripe subscription `status` should be treated as an entitlement to
 * Pro. `trialing` counts; `past_due` / `canceled` / `incomplete` / `unpaid` /
 * `incomplete_expired` do not.
 */
export function isActiveStatus(status: string): boolean {
  return status === "active" || status === "trialing";
}
