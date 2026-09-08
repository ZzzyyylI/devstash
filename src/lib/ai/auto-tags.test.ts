import { describe, expect, it } from "vitest";

import {
  MAX_TAG_LENGTH,
  MAX_TAG_SUGGESTIONS,
  TAG_CONTENT_LIMIT,
  normalizeTags,
  parseTagList,
  truncateForTagging,
} from "@/lib/ai/auto-tags";

describe("truncateForTagging", () => {
  it("returns '' for null / undefined", () => {
    expect(truncateForTagging(null)).toBe("");
    expect(truncateForTagging(undefined)).toBe("");
  });

  it("clips content to the character limit", () => {
    const long = "x".repeat(TAG_CONTENT_LIMIT + 500);
    expect(truncateForTagging(long)).toHaveLength(TAG_CONTENT_LIMIT);
  });

  it("leaves shorter content untouched", () => {
    expect(truncateForTagging("const a = 1")).toBe("const a = 1");
  });
});

describe("parseTagList", () => {
  it("reads the { tags: [...] } shape", () => {
    expect(parseTagList('{"tags": ["react", "hooks"]}')).toEqual([
      "react",
      "hooks",
    ]);
  });

  it("reads a bare array", () => {
    expect(parseTagList('["react", "hooks"]')).toEqual(["react", "hooks"]);
  });

  it("returns [] for invalid JSON", () => {
    expect(parseTagList("not json")).toEqual([]);
    expect(parseTagList("")).toEqual([]);
  });

  it("returns [] for an unexpected JSON shape", () => {
    expect(parseTagList('{"foo": 1}')).toEqual([]);
    expect(parseTagList("42")).toEqual([]);
  });

  it("drops non-string entries", () => {
    expect(parseTagList('{"tags": ["react", 5, null, "hooks"]}')).toEqual([
      "react",
      "hooks",
    ]);
  });
});

describe("normalizeTags", () => {
  it("lowercases, trims, and collapses internal whitespace", () => {
    expect(normalizeTags(["  React  ", "State   Management"])).toEqual([
      "react",
      "state management",
    ]);
  });

  it("de-dupes case-insensitively", () => {
    expect(normalizeTags(["React", "react", "REACT"])).toEqual(["react"]);
  });

  it("drops blanks and overlong entries", () => {
    expect(normalizeTags(["", "   ", "x".repeat(MAX_TAG_LENGTH + 1), "ok"])).toEqual(
      ["ok"],
    );
  });

  it("caps the list at MAX_TAG_SUGGESTIONS", () => {
    const many = Array.from({ length: 12 }, (_, i) => `tag-${i}`);
    expect(normalizeTags(many)).toHaveLength(MAX_TAG_SUGGESTIONS);
  });
});
