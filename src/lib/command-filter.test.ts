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
    expect(commandFilter("x", "test", ["Unit test helper"])).toBe(1);
  });

  it("is case-insensitive", () => {
    expect(commandFilter("x", "REACT", ["useReactQuery hook"])).toBe(1);
  });

  it("requires every whitespace-separated token to be present somewhere", () => {
    const keywords = ["Deploy to production", "npm run build"];
    expect(commandFilter("x", "deploy build", keywords)).toBe(1);
    expect(commandFilter("x", "deploy staging", keywords)).toBe(0);
  });

  it("scores every match the same, regardless of field or position", () => {
    // Previously graded by field index and match offset; now binary so cmdk's
    // score-descending sort doesn't reshuffle the list on each keystroke.
    expect(commandFilter("x", "cache", ["cache helper", "misc"])).toBe(1);
    expect(commandFilter("x", "cache", ["misc helper", "clears cache"])).toBe(1);
    expect(commandFilter("x", "run", ["run tests"])).toBe(1);
    expect(commandFilter("x", "run", ["please run"])).toBe(1);
  });

  it("falls back to `value` when no keywords are supplied", () => {
    expect(commandFilter("Terminal Commands", "terminal")).toBe(1);
    expect(commandFilter("Terminal Commands", "python")).toBe(0);
  });
});
