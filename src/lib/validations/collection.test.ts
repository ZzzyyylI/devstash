import { describe, expect, it } from "vitest";

import {
  createCollectionSchema,
  updateCollectionSchema,
} from "@/lib/validations/collection";

describe("createCollectionSchema", () => {
  it("trims the name and requires it to be non-empty", () => {
    expect(createCollectionSchema.parse({ name: "  React Patterns  " }).name).toBe(
      "React Patterns",
    );

    const result = createCollectionSchema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name?.[0]).toMatch(/required/i);
    }
  });

  it("rejects a name longer than 120 characters", () => {
    const result = createCollectionSchema.safeParse({ name: "x".repeat(121) });
    expect(result.success).toBe(false);
  });

  it("rejects a missing or non-string name (the route's 400 path)", () => {
    expect(createCollectionSchema.safeParse({}).success).toBe(false);
    expect(createCollectionSchema.safeParse({ name: 123 }).success).toBe(false);
  });

  it("collapses a blank / missing description to null and trims otherwise", () => {
    expect(createCollectionSchema.parse({ name: "A" }).description).toBeNull();
    expect(
      createCollectionSchema.parse({ name: "A", description: "   " }).description,
    ).toBeNull();
    expect(
      createCollectionSchema.parse({ name: "A", description: null }).description,
    ).toBeNull();
    expect(
      createCollectionSchema.parse({ name: "A", description: "  notes  " })
        .description,
    ).toBe("notes");
  });
});

describe("updateCollectionSchema", () => {
  it("has the same shape as createCollectionSchema", () => {
    expect(updateCollectionSchema).toBe(createCollectionSchema);
  });

  it("trims the name, requires it, and normalises the description", () => {
    expect(
      updateCollectionSchema.parse({ name: "  Renamed  ", description: "  x  " }),
    ).toEqual({ name: "Renamed", description: "x" });

    const result = updateCollectionSchema.safeParse({ name: "  " });
    expect(result.success).toBe(false);
  });
});
