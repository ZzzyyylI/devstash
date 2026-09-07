import { describe, expect, it } from "vitest";

import { parseTagsInput } from "@/lib/tags";

describe("parseTagsInput", () => {
  it("splits on commas and trims each tag", () => {
    expect(parseTagsInput("react, hooks ,  patterns")).toEqual([
      "react",
      "hooks",
      "patterns",
    ]);
  });

  it("drops blank / whitespace-only entries", () => {
    expect(parseTagsInput("react,, ,  , hooks,")).toEqual(["react", "hooks"]);
  });

  it("returns an empty array for an empty or blank string", () => {
    expect(parseTagsInput("")).toEqual([]);
    expect(parseTagsInput("   ")).toEqual([]);
    expect(parseTagsInput(" , , ")).toEqual([]);
  });

  it("keeps a single tag with no commas", () => {
    expect(parseTagsInput("  solo  ")).toEqual(["solo"]);
  });

  it("does not de-dupe (the server schema does)", () => {
    expect(parseTagsInput("a, a, b")).toEqual(["a", "a", "b"]);
  });
});
