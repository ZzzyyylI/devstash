"use client";

import { useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { postJson } from "@/lib/post-json";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PRICING } from "@/lib/home-content";
import type { BillingInterval } from "@/lib/stripe/plans";

interface BillingSectionProps {
  isPro: boolean;
  /** Whether the user already has a Stripe customer (gates "Manage billing"). */
  hasCustomer: boolean;
}

type CheckoutResponse = { data?: { url?: string | null } };

/**
 * "Plan & billing" card on `/settings`. Free users pick a cadence and start
 * Stripe Checkout; Pro users open the Billing Portal. Both endpoints return
 * `{ success, data: { url } }` and we redirect the browser to that URL. Card
 * chrome matches the other settings cards.
 */
export function BillingSection({ isPro, hasCustomer }: BillingSectionProps) {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [pending, setPending] = useState(false);

  async function go(path: string, body?: unknown) {
    if (pending) return;
    setPending(true);

    const res = await postJson<CheckoutResponse>(path, body);
    const url = res.data?.data?.url;

    if (res.ok && url) {
      window.location.assign(url);
      return; // leave `pending` true — we're navigating away
    }

    setPending(false);
    toast.error(
      res.status === 0
        ? "Could not reach billing. Check your connection and try again."
        : "Something went wrong starting the billing session. Try again.",
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-foreground">
          {isPro ? "DevStash Pro" : "Free plan"}
        </p>
        {isPro && (
          <Badge
            variant="outline"
            className="border-[#f59e0b]/40 bg-[#f59e0b]/15 text-[10px] font-semibold tracking-wide text-[#f59e0b] uppercase"
          >
            Pro
          </Badge>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {isPro
          ? "Unlimited items and collections, file uploads, and every Pro feature."
          : "50 items, 3 collections, image uploads. Upgrade for unlimited everything and file uploads."}
      </p>

      <div className="mt-3">
        {isPro ? (
          <Button
            variant="outline"
            size="sm"
            disabled={pending || !hasCustomer}
            onClick={() => go("/api/stripe/portal")}
          >
            {pending ? "Opening…" : "Manage billing"}
          </Button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Billing period"
              className="inline-flex rounded-full border border-border p-0.5"
            >
              {(["monthly", "yearly"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={interval === option}
                  onClick={() => setInterval(option)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors",
                    interval === option
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option} · {PRICING[option].amount}
                  {PRICING[option].cycle}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              disabled={pending}
              onClick={() => go("/api/stripe/checkout", { interval })}
            >
              {pending ? "Redirecting…" : "Upgrade to Pro"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
