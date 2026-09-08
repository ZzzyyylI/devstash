import { describe, expect, it } from "vitest";

import {
  DESCRIPTION_CONTENT_LIMIT,
  MAX_DESCRIPTION_LENGTH,
  buildDescriptionInput,
  sanitizeDescription,
  truncateForDescription,
} from "@/lib/ai/description";

describe("truncateForDescription", () => {
  it("returns '' for null / undefined", () => {
    expect(truncateForDescription(null)).toBe("");
    expect(truncateForDescription(undefined)).toBe("");
  });

  it("clips content to the character limit", () => {
    const long = "x".repeat(DESCRIPTION_CONTENT_LIMIT + 500);
    expect(truncateForDescription(long)).toHaveLength(DESCRIPTION_CONTENT_LIMIT);
  });

  it("leaves shorter content untouched", () => {
    expect(truncateForDescription("const a = 1")).toBe("const a = 1");
  });
});

describe("buildDescriptionInput", () => {
  it("always includes Type and Title plus the closing instruction", () => {
    const input = buildDescriptionInput({ title: "useDebounce", type: "snippet" });
    expect(input).toContain("Type: snippet");
    expect(input).toContain("Title: useDebounce");
    expect(input).toMatch(/1-2 sentence description/);
  });

  it("omits optional fields when blank and includes them when present", () => {
    const bare = buildDescriptionInput({
      title: "t",
      type: "note",
      content: "  ",
      url: null,
      language: "",
      description: undefined,
    });
    expect(bare).not.toMatch(/Language:|URL:|Content:|Current description/);

    const full = buildDescriptionInput({
      title: "t",
      type: "snippet",
      content: "export const x = 1",
      url: "https://example.com",
      language: "typescript",
      description: "rough notes",
    });
    expect(full).toContain("Language: typescript");
    expect(full).toContain("URL: https://example.com");
    expect(full).toContain("Current description (may be rough): rough notes");
    expect(full).toContain("Content:\nexport const x = 1");
  });

  it("truncates long content in the built input", () => {
    const input = buildDescriptionInput({
      title: "t",
      type: "note",
      content: "y".repeat(DESCRIPTION_CONTENT_LIMIT + 100),
    });
    expect(input).toContain("y".repeat(DESCRIPTION_CONTENT_LIMIT));
    expect(input).not.toContain("y".repeat(DESCRIPTION_CONTENT_LIMIT + 1));
  });
});

describe("sanitizeDescription", () => {
  it("returns '' for null / undefined / blank", () => {
    expect(sanitizeDescription(null)).toBe("");
    expect(sanitizeDescription(undefined)).toBe("");
    expect(sanitizeDescription("   \n  ")).toBe("");
  });

  it("collapses whitespace and newlines", () => {
    expect(sanitizeDescription("A hook\n that   debounces.")).toBe(
      "A hook that debounces.",
    );
  });

  it("strips a single pair of wrapping quotes", () => {
    expect(sanitizeDescription('"A debounce hook."')).toBe("A debounce hook.");
    expect(sanitizeDescription("“A debounce hook.”")).toBe("A debounce hook.");
    expect(sanitizeDescription('She said "hi" once.')).toBe('She said "hi" once.');
  });

  it("keeps at most two sentences", () => {
    expect(
      sanitizeDescription("One thing. Two thing. Three thing. Four."),
    ).toBe("One thing. Two thing.");
  });

  it("clips very long output on a word boundary with an ellipsis", () => {
    const long = `${"word ".repeat(120)}`.trim();
    const out = sanitizeDescription(long);
    expect(out.length).toBeLessThanOrEqual(MAX_DESCRIPTION_LENGTH + 1);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/wor…$/);
  });
});
