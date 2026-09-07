import { describe, expect, it } from "vitest";

import { commandFilter } from "@/lib/command-filter";

describe("commandFilter", () => {
  it("matches everything when the query is empty or whitespace", () => {
    expect(commandFilter("anything", "")).toBe(1);
    expect(commandFilter("anything", "   ", ["kw"])).toBe(1);
  });

  it("requires a literal substring, not a subsequence", () => {
    // "test" as a subsequence of "The easiest step" but not a substring.
    expect(commandFilter("x", "test", ["The easiest step"])).toBe(0);
    expect(commandFilter("x", "test", ["Unit test helper"])).toBeGreaterThan(0);
  });

  it("is case-insensitive", () => {
    expect(commandFilter("x", "REACT", ["useReactQuery hook"])).toBeGreaterThan(
      0,
    );
  });

  it("requires every whitespace-separated token to be present somewhere", () => {
    const keywords = ["Deploy to production", "npm run build"];
    expect(commandFilter("x", "deploy build", keywords)).toBeGreaterThan(0);
    expect(commandFilter("x", "deploy staging", keywords)).toBe(0);
  });

  it("ranks a title (first field) hit above a later-field hit", () => {
    const titleHit = commandFilter("x", "cache", ["cache helper", "misc"]);
    const bodyHit = commandFilter("x", "cache", ["misc helper", "clears cache"]);
    expect(titleHit).toBeGreaterThan(bodyHit);
  });

  it("ranks an earlier position within a field higher", () => {
    const early = commandFilter("x", "run", ["run tests"]);
    const late = commandFilter("x", "run", ["please run"]);
    expect(early).toBeGreaterThan(late);
  });

  it("falls back to `value` when no keywords are supplied", () => {
    expect(commandFilter("Terminal Commands", "terminal")).toBeGreaterThan(0);
    expect(commandFilter("Terminal Commands", "python")).toBe(0);
  });
});
