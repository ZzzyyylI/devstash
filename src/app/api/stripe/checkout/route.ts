import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/base-url";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { priceIdForInterval } from "@/lib/stripe/plans";
import { checkoutSchema } from "@/lib/validations/billing";
import {
  INVALID_JSON,
  invalidJsonResponse,
  readJsonBody,
  validationErrorResponse,
} from "@/lib/api/request";

/**
 * POST /api/stripe/checkout  { interval: "monthly" | "yearly" }
 *   → { success: true, data: { url } }   (client redirects to `url`)
 *
 * Creates (or reuses) the Stripe customer for the signed-in user, then opens a
 * hosted subscription Checkout Session. Entitlement is granted later by the
 * webhook — never by the `success_url`.
 *
 * Kept an API route (not a Server Action) to match the collection-mutation
 * convention and because the client needs a plain fetch endpoint.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const stripe = getStripe();
  if (!stripe || !isStripeConfigured()) {
    return NextResponse.json(
      { success: false, error: "Billing is not configured." },
      { status: 503 },
    );
  }

  const body = await readJsonBody(request);
  if (body === INVALID_JSON) return invalidJsonResponse();

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error, "Invalid billing selection");
  }

  const priceId = priceIdForInterval(parsed.data.interval);
  if (!priceId) {
    return NextResponse.json(
      { success: false, error: "That plan is unavailable." },
      { status: 503 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, isPro: true, stripeCustomerId: true },
  });
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Account not found." },
      { status: 404 },
    );
  }
  if (user.isPro) {
    return NextResponse.json(
      { success: false, error: "You're already on Pro." },
      { status: 409 },
    );
  }

  // Persist a freshly-created customer id BEFORE returning the Checkout URL, so a
  // retried upgrade reuses it instead of spawning a duplicate Stripe customer.
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const origin = getBaseUrl(request);
  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id,
    subscription_data: { metadata: { userId: user.id } },
    allow_promotion_codes: true,
    success_url: `${origin}/settings?checkout=success`,
    cancel_url: `${origin}/settings?checkout=cancelled`,
  });

  return NextResponse.json({ success: true, data: { url: checkout.url } });
}
