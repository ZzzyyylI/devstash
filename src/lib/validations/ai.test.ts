import { describe, expect, it } from "vitest";

import { autoTagSchema } from "@/lib/validations/ai";

describe("autoTagSchema", () => {
  it("accepts a title with content and trims both", () => {
    const parsed = autoTagSchema.parse({
      title: "  useDebounce hook  ",
      content: "  export function useDebounce() {}  ",
    });
    expect(parsed).toEqual({
      title: "useDebounce hook",
      content: "export function useDebounce() {}",
    });
  });

  it("collapses missing / blank content to null", () => {
    expect(autoTagSchema.parse({ title: "x" }).content).toBeNull();
    expect(autoTagSchema.parse({ title: "x", content: "   " }).content).toBeNull();
    expect(autoTagSchema.parse({ title: "x", content: null }).content).toBeNull();
  });

  it("rejects an empty title", () => {
    expect(autoTagSchema.safeParse({ title: "   " }).success).toBe(false);
    expect(autoTagSchema.safeParse({ content: "hi" }).success).toBe(false);
  });

  it("rejects an over-long title", () => {
    expect(
      autoTagSchema.safeParse({ title: "x".repeat(201) }).success,
    ).toBe(false);
  });
});
