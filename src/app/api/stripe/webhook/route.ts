import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe/client";
import { syncSubscriptionForCustomer } from "@/lib/stripe/subscription";

// Signature verification needs Node's crypto + the raw request body.
export const runtime = "nodejs";

/**
 * POST /api/stripe/webhook
 *
 * Stripe calls this, so it's public — but every request is authenticated by the
 * `stripe-signature` header via `webhooks.constructEvent` on the **raw** body.
 * Deliberately NOT listed in `src/proxy.ts` (which only guards `/dashboard`,
 * `/profile`, `/settings`, `/favorites`) — keep it that way.
 *
 * Every handled event funnels through `syncSubscriptionForCustomer`, which
 * re-reads Stripe and reconciles the `User` row, so this handler is idempotent
 * and order-independent.
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json(
      { error: "Billing is not configured." },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // Raw body — never `request.json()`; any re-serialisation breaks the signature.
  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error("[stripe] signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.customer) {
          await syncSubscriptionForCustomer(s.customer as string);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscriptionForCustomer(sub.customer as string);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.customer) {
          await syncSubscriptionForCustomer(invoice.customer as string);
        }
        break;
      }
      default:
        break; // ignore everything else
    }
  } catch (error) {
    console.error(`[stripe] handler failed for ${event.type}:`, error);
    // 500 → Stripe retries with backoff.
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
