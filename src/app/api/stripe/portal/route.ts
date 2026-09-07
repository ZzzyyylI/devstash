import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/base-url";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";

/**
 * POST /api/stripe/portal → { success: true, data: { url } }
 *
 * Opens the Stripe-hosted Billing Portal (update payment method, switch plan,
 * cancel). Requires a signed-in user who already has a Stripe customer — a free
 * user who has never checked out gets a `409`.
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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stripeCustomerId: true },
  });
  if (!user?.stripeCustomerId) {
    return NextResponse.json(
      { success: false, error: "No billing account yet — upgrade first." },
      { status: 409 },
    );
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${getBaseUrl(request)}/settings`,
  });

  return NextResponse.json({ success: true, data: { url: portal.url } });
}
