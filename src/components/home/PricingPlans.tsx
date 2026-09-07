"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { postJson } from "@/lib/post-json";
import { FREE_FEATURES, PRICING, PRO_FEATURES } from "@/lib/home-content";

type Period = "monthly" | "yearly";

/**
 * Billing toggle + the Free / Pro plan cards.
 *
 * Signed-out visitors are routed to `/register`. A signed-in visitor can start
 * Stripe Checkout for the toggled period straight from the Pro card; entitlement
 * is still granted by the webhook, not the return URL.
 */
export function PricingPlans({ signedIn = false }: { signedIn?: boolean }) {
  const [period, setPeriod] = useState<Period>("monthly");
  const [pending, setPending] = useState(false);
  const pro = PRICING[period];

  async function startCheckout() {
    if (pending) return;
    setPending(true);

    const res = await postJson<{ data?: { url?: string | null } }>(
      "/api/stripe/checkout",
      { interval: period },
    );
    const url = res.data?.data?.url;

    if (res.ok && url) {
      window.location.assign(url);
      return;
    }

    setPending(false);
    toast.error(
      res.status === 409
        ? "You're already on Pro."
        : "Could not start checkout. Try again.",
    );
  }

  return (
    <>
      <div
        role="group"
        aria-label="Billing period"
        className="mx-auto mb-12 flex w-fit items-center gap-1 rounded-full border border-border bg-card p-1"
      >
        {(["monthly", "yearly"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={period === option}
            onClick={() => setPeriod(option)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition-colors",
              period === option
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

      <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
        <PlanCard
          name="Free"
          amount="$0"
          period="forever"
          features={FREE_FEATURES}
          cta={
            <Button asChild variant="outline" className="w-full">
              <Link href={signedIn ? "/dashboard" : "/register"}>
                {signedIn ? "Go to dashboard" : "Get started"}
              </Link>
            </Button>
          }
        />
        <PlanCard
          featured
          name="Pro"
          amount={pro.amount}
          cycle={pro.cycle}
          period={pro.period}
          features={PRO_FEATURES}
          cta={
            signedIn ? (
              <Button
                className="w-full"
                disabled={pending}
                onClick={startCheckout}
              >
                {pending ? "Redirecting…" : "Go Pro"}
              </Button>
            ) : (
              <Button asChild className="w-full">
                <Link href="/register">Go Pro</Link>
              </Button>
            )
          }
        />
      </div>
    </>
  );
}

function PlanCard({
  name,
  amount,
  cycle,
  period,
  features,
  cta,
  featured = false,
}: {
  name: string;
  amount: string;
  cycle?: string;
  period: string;
  features: string[];
  cta: ReactNode;
  featured?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative rounded-xl border bg-card/60 p-8",
        featured
          ? "border-[#6366f1]/55 shadow-[0_24px_60px_-18px_rgba(99,102,241,0.4)]"
          : "border-border",
      )}
    >
      {featured && (
        <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-br from-[#3b82f6] to-[#6366f1] text-white">
          Most Popular
        </Badge>
      )}
      <h3 className="text-xl font-bold">{name}</h3>
      <p className="mt-2 flex items-baseline gap-1">
        <span className="text-4xl font-extrabold tracking-tight">{amount}</span>
        {cycle && (
          <span className="font-semibold text-muted-foreground">{cycle}</span>
        )}
      </p>
      <p className="text-sm text-muted-foreground">{period}</p>
      <ul className="my-6 grid gap-2.5">
        {features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2 text-sm text-muted-foreground"
          >
            <Check className="mt-0.5 size-4 shrink-0 text-[#22c55e]" />
            {feature}
          </li>
        ))}
      </ul>
      {cta}
    </div>
  );
}
