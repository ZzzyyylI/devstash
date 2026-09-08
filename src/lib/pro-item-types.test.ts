import { describe, expect, it } from "vitest";

import { PRO_ITEM_TYPE_NAMES, isProItemType } from "@/lib/pro-item-types";

describe("isProItemType", () => {
  it("is true for the gated types, case-insensitively", () => {
    expect(isProItemType("file")).toBe(true);
    expect(isProItemType("image")).toBe(true);
    expect(isProItemType("File")).toBe(true);
    expect(isProItemType("IMAGE")).toBe(true);
  });

  it("is false for free types", () => {
    for (const name of ["snippet", "prompt", "note", "command", "url"]) {
      expect(isProItemType(name)).toBe(false);
    }
  });

  it("exposes the gated names as a set", () => {
    expect(PRO_ITEM_TYPE_NAMES.has("file")).toBe(true);
    expect(PRO_ITEM_TYPE_NAMES.has("image")).toBe(true);
    expect(PRO_ITEM_TYPE_NAMES.has("snippet")).toBe(false);
  });
});
