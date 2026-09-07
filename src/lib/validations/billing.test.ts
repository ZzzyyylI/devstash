import { describe, expect, it } from "vitest";

import { checkoutSchema } from "@/lib/validations/billing";

describe("checkoutSchema", () => {
  it("accepts the two supported intervals", () => {
    expect(checkoutSchema.safeParse({ interval: "monthly" }).success).toBe(true);
    expect(checkoutSchema.safeParse({ interval: "yearly" }).success).toBe(true);
  });

  it("rejects an unsupported interval", () => {
    expect(checkoutSchema.safeParse({ interval: "weekly" }).success).toBe(false);
  });

  it("rejects a missing interval", () => {
    expect(checkoutSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a non-string interval", () => {
    expect(checkoutSchema.safeParse({ interval: 5 }).success).toBe(false);
  });
});
