import type Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe/client";
import { isActiveStatus } from "@/lib/stripe/plans";

/**
 * The **only** writer of the subscription columns on `User`
 * (`isPro` / `stripeSubscriptionId` / `stripePriceId` / `stripeCurrentPeriodEnd`).
 *
 * Given a Stripe customer id, it re-reads that customer's latest subscription
 * from Stripe (the source of truth) and reconciles the `User` row to it —
 * clearing every field when there's no live subscription. Because it always
 * re-reads rather than trusting the triggering event's payload, it's idempotent
 * and order-independent: webhook retries and out-of-order delivery converge to
 * the same state, so no processed-event table is needed for v1.
 *
 * Called only from the Stripe webhook handler. No-ops when Stripe isn't
 * configured, and warns (without throwing) for a customer we don't recognise.
 */
export async function syncSubscriptionForCustomer(
  customerId: string,
): Promise<void> {
  const stripe = getStripe();
  if (!stripe) return;

  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  if (!user) {
    console.warn(`[stripe] webhook for unknown customer ${customerId}`);
    return;
  }

  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 1,
  });
  const sub: Stripe.Subscription | undefined = subs.data[0];

  // No subscription, or one that's fully dead — strip Pro entirely.
  if (
    !sub ||
    sub.status === "canceled" ||
    sub.status === "incomplete_expired"
  ) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isPro: false,
        stripeSubscriptionId: null,
        stripePriceId: null,
        stripeCurrentPeriodEnd: null,
      },
    });
    return;
  }

  const item = sub.items.data[0];
  const priceId = item?.price.id ?? null;
  // `current_period_end` moved from the subscription onto its items in recent
  // API versions (this SDK pins `2026-08-26.dahlia`). It's Unix seconds.
  const periodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000)
    : null;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isPro: isActiveStatus(sub.status),
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: periodEnd,
    },
  });
}
