import { describe, expect, it } from "vitest";

import {
  EXPLAIN_CONTENT_LIMIT,
  MAX_EXPLANATION_LENGTH,
  buildExplainInput,
  sanitizeExplanation,
  truncateForExplain,
} from "@/lib/ai/explain";

describe("truncateForExplain", () => {
  it("returns '' for null / undefined", () => {
    expect(truncateForExplain(null)).toBe("");
    expect(truncateForExplain(undefined)).toBe("");
  });

  it("clips content to the character limit", () => {
    const long = "x".repeat(EXPLAIN_CONTENT_LIMIT + 500);
    expect(truncateForExplain(long)).toHaveLength(EXPLAIN_CONTENT_LIMIT);
  });

  it("leaves shorter content untouched", () => {
    expect(truncateForExplain("const a = 1")).toBe("const a = 1");
  });
});

describe("buildExplainInput", () => {
  it("always includes Type, Title, the code block and the closing instruction", () => {
    const input = buildExplainInput({
      title: "useDebounce",
      content: "const x = 1",
    });
    expect(input).toContain("Type: snippet");
    expect(input).toContain("Title: useDebounce");
    expect(input).toContain("Code:\nconst x = 1");
    expect(input).toMatch(/Write the explanation now/);
  });

  it("uses the given type and includes Language only when present", () => {
    const bare = buildExplainInput({
      title: "t",
      content: "echo hi",
      type: "command",
      language: "",
    });
    expect(bare).toContain("Type: command");
    expect(bare).not.toMatch(/Language:/);

    const withLang = buildExplainInput({
      title: "t",
      content: "const x = 1",
      type: "snippet",
      language: "typescript",
    });
    expect(withLang).toContain("Language: typescript");
  });

  it("truncates long content in the built input", () => {
    const input = buildExplainInput({
      title: "t",
      content: "y".repeat(EXPLAIN_CONTENT_LIMIT + 100),
    });
    expect(input).toContain("y".repeat(EXPLAIN_CONTENT_LIMIT));
    expect(input).not.toContain("y".repeat(EXPLAIN_CONTENT_LIMIT + 1));
  });
});

describe("sanitizeExplanation", () => {
  it("returns '' for null / undefined / blank", () => {
    expect(sanitizeExplanation(null)).toBe("");
    expect(sanitizeExplanation(undefined)).toBe("");
    expect(sanitizeExplanation("  \n  ")).toBe("");
  });

  it("normalises line endings and collapses blank-line runs", () => {
    expect(sanitizeExplanation("a\r\n\r\n\r\n\r\nb")).toBe("a\n\nb");
  });

  it("leaves a well-formed short explanation untouched", () => {
    const md = "It debounces a value.\n\n- Uses a timer\n- Clears on change";
    expect(sanitizeExplanation(md)).toBe(md);
  });

  it("clips very long output on a boundary with an ellipsis", () => {
    const long = `${"word ".repeat(800)}`.trim();
    const out = sanitizeExplanation(long);
    expect(out.length).toBeLessThanOrEqual(MAX_EXPLANATION_LENGTH + 1);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/wor…$/);
  });
});
