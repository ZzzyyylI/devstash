"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { postJson } from "@/lib/post-json";
import { Button } from "@/components/ui/button";
import { PRICING, PRO_FEATURES } from "@/lib/home-content";
import type { BillingInterval } from "@/lib/stripe/plans";

/**
 * The `/upgrade` plan card: a monthly / yearly toggle, the Pro feature list, and
 * a CTA that starts Stripe Checkout for the selected cadence. Mirrors the
 * homepage `PricingPlans` checkout call — entitlement is still granted by the
 * webhook, not the return URL.
 */
export function UpgradePlan() {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [pending, setPending] = useState(false);
  const price = PRICING[interval];

  async function startCheckout() {
    if (pending) return;
    setPending(true);

    const res = await postJson<{ data?: { url?: string | null } }>(
      "/api/stripe/checkout",
      { interval },
    );
    const url = res.data?.data?.url;

    if (res.ok && url) {
      window.location.assign(url);
      return; // leave `pending` true — we're navigating away
    }

    setPending(false);
    toast.error(
      res.status === 409
        ? "You're already on Pro."
        : res.status === 0
          ? "Could not reach checkout. Check your connection and try again."
          : "Could not start checkout. Try again.",
    );
  }

  return (
    <div className="rounded-xl border border-[#6366f1]/55 bg-card/60 p-6 shadow-[0_24px_60px_-18px_rgba(99,102,241,0.4)]">
      <div
        role="group"
        aria-label="Billing period"
        className="mx-auto flex w-fit items-center gap-1 rounded-full border border-border bg-card p-1"
      >
        {(["monthly", "yearly"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={interval === option}
            onClick={() => setInterval(option)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition-colors",
              interval === option
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option}
            {option === "yearly" && (
              <span className="rounded-full bg-[#22c55e]/15 px-1.5 text-[0.68rem] font-bold text-[#22c55e]">
                2 months free
              </span>
            )}
          </button>
        ))}
      </div>

      <p className="mt-6 flex items-baseline justify-center gap-1">
        <span className="text-4xl font-extrabold tracking-tight">
          {price.amount}
        </span>
        <span className="font-semibold text-muted-foreground">{price.cycle}</span>
      </p>
      <p className="text-center text-sm text-muted-foreground">{price.period}</p>

      <ul className="mx-auto my-6 grid max-w-xs gap-2.5">
        {PRO_FEATURES.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2 text-sm text-muted-foreground"
          >
            <Check className="mt-0.5 size-4 shrink-0 text-[#22c55e]" />
            {feature}
          </li>
        ))}
      </ul>

      <Button className="w-full" disabled={pending} onClick={startCheckout}>
        {pending ? "Redirecting…" : `Upgrade — ${price.amount}${price.cycle}`}
      </Button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Secure checkout via Stripe. Cancel anytime.
      </p>
    </div>
  );
}
