import { z } from "zod";

/**
 * Payload for the Phase 2 "start checkout" action — the caller only picks a
 * billing cadence; the Price id is resolved server-side via
 * `priceIdForInterval()` in `src/lib/stripe/plans.ts`.
 */
export const checkoutSchema = z.object({
  interval: z.enum(["monthly", "yearly"]),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
