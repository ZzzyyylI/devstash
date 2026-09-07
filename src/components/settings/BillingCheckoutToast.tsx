"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Fires a one-shot `sonner` toast when the user returns from Stripe Checkout
 * (`/settings?checkout=success|cancelled`). Rendered by the settings page, which
 * reads the query param server-side. Entitlement itself comes from the webhook —
 * this is only a status nudge; a page reload reflects the real Pro state.
 */
export function BillingCheckoutToast({
  status,
}: {
  status: "success" | "cancelled";
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    if (status === "success") {
      toast.success(
        "Payment received. Your Pro features unlock as soon as Stripe confirms — reload in a moment if you don't see them.",
      );
    } else {
      toast("Checkout cancelled — you're still on the free plan.");
    }
  }, [status]);

  return null;
}
