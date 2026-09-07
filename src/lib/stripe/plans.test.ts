import { afterEach, describe, expect, it, vi } from "vitest";

import {
  PLAN_LIMITS,
  intervalForPriceId,
  isActiveStatus,
  priceIdForInterval,
} from "@/lib/stripe/plans";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("priceIdForInterval / intervalForPriceId", () => {
  it("returns null for both intervals when the env is unset", () => {
    vi.stubEnv("STRIPE_PRICE_ID_MONTHLY", undefined);
    vi.stubEnv("STRIPE_PRICE_ID_YEARLY", undefined);

    expect(priceIdForInterval("monthly")).toBeNull();
    expect(priceIdForInterval("yearly")).toBeNull();
  });

  it("maps each interval to its configured price id", () => {
    vi.stubEnv("STRIPE_PRICE_ID_MONTHLY", "price_monthly_123");
    vi.stubEnv("STRIPE_PRICE_ID_YEARLY", "price_yearly_456");

    expect(priceIdForInterval("monthly")).toBe("price_monthly_123");
    expect(priceIdForInterval("yearly")).toBe("price_yearly_456");
  });

  it("round-trips a price id back to its interval", () => {
    vi.stubEnv("STRIPE_PRICE_ID_MONTHLY", "price_monthly_123");
    vi.stubEnv("STRIPE_PRICE_ID_YEARLY", "price_yearly_456");

    expect(intervalForPriceId(priceIdForInterval("monthly")!)).toBe("monthly");
    expect(intervalForPriceId(priceIdForInterval("yearly")!)).toBe("yearly");
  });

  it("returns null for an unknown price id", () => {
    vi.stubEnv("STRIPE_PRICE_ID_MONTHLY", "price_monthly_123");
    vi.stubEnv("STRIPE_PRICE_ID_YEARLY", "price_yearly_456");

    expect(intervalForPriceId("price_does_not_exist")).toBeNull();
  });

  it("returns null for any price id when the env is unset", () => {
    vi.stubEnv("STRIPE_PRICE_ID_MONTHLY", undefined);
    vi.stubEnv("STRIPE_PRICE_ID_YEARLY", undefined);

    expect(intervalForPriceId("price_monthly_123")).toBeNull();
    expect(intervalForPriceId("")).toBeNull();
  });
});

describe("isActiveStatus", () => {
  it("treats active and trialing as entitlement", () => {
    expect(isActiveStatus("active")).toBe(true);
    expect(isActiveStatus("trialing")).toBe(true);
  });

  it("treats every other status as not entitled", () => {
    for (const status of [
      "past_due",
      "canceled",
      "incomplete",
      "incomplete_expired",
      "unpaid",
      "paused",
      "",
    ]) {
      expect(isActiveStatus(status)).toBe(false);
    }
  });
});

describe("PLAN_LIMITS", () => {
  it("caps the free plan at 50 items and 3 collections", () => {
    expect(PLAN_LIMITS.free).toEqual({ items: 50, collections: 3 });
  });

  it("leaves the pro plan unlimited", () => {
    expect(PLAN_LIMITS.pro.items).toBe(Infinity);
    expect(PLAN_LIMITS.pro.collections).toBe(Infinity);
  });
});
