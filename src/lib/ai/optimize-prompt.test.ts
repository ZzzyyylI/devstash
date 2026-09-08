import { describe, expect, it } from "vitest";

import {
  MAX_OPTIMIZED_PROMPT_LENGTH,
  PROMPT_ALREADY_OPTIMAL,
  PROMPT_CONTENT_LIMIT,
  buildOptimizeInput,
  interpretOptimizeResponse,
  sanitizeOptimizedPrompt,
  stripEchoedTitle,
  truncateForOptimize,
} from "@/lib/ai/optimize-prompt";

describe("truncateForOptimize", () => {
  it("returns '' for null / undefined", () => {
    expect(truncateForOptimize(null)).toBe("");
    expect(truncateForOptimize(undefined)).toBe("");
  });

  it("clips content to the character limit", () => {
    const long = "x".repeat(PROMPT_CONTENT_LIMIT + 500);
    expect(truncateForOptimize(long)).toHaveLength(PROMPT_CONTENT_LIMIT);
  });

  it("leaves shorter content untouched", () => {
    expect(truncateForOptimize("write a haiku")).toBe("write a haiku");
  });
});

describe("buildOptimizeInput", () => {
  it("includes the title, the current prompt and the closing instruction", () => {
    const input = buildOptimizeInput({
      title: "Summarize a PR",
      content: "summarize this pr",
    });
    expect(input).toContain('titled "Summarize a PR"');
    expect(input).toContain("Current prompt:\nsummarize this pr");
    expect(input).toContain(PROMPT_ALREADY_OPTIMAL);
    expect(input).toMatch(/Rewrite the prompt now/);
  });

  it("truncates long content in the built input", () => {
    const input = buildOptimizeInput({
      title: "t",
      content: "y".repeat(PROMPT_CONTENT_LIMIT + 100),
    });
    expect(input).toContain("y".repeat(PROMPT_CONTENT_LIMIT));
    expect(input).not.toContain("y".repeat(PROMPT_CONTENT_LIMIT + 1));
  });
});

describe("sanitizeOptimizedPrompt", () => {
  it("returns '' for null / undefined / blank", () => {
    expect(sanitizeOptimizedPrompt(null)).toBe("");
    expect(sanitizeOptimizedPrompt(undefined)).toBe("");
    expect(sanitizeOptimizedPrompt("  \n  ")).toBe("");
  });

  it("normalises line endings and collapses blank-line runs", () => {
    expect(sanitizeOptimizedPrompt("a\r\n\r\n\r\n\r\nb")).toBe("a\n\nb");
  });

  it("strips a single wrapping code fence", () => {
    expect(sanitizeOptimizedPrompt("```\nRewritten prompt.\n```")).toBe(
      "Rewritten prompt.",
    );
    expect(sanitizeOptimizedPrompt("```text\nRewritten prompt.\n```")).toBe(
      "Rewritten prompt.",
    );
  });

  it("strips a leading 'Title:' line echoed from the input scaffold", () => {
    expect(
      sanitizeOptimizedPrompt("Title: Code review prompt\n\nReview the diff."),
    ).toBe("Review the diff.");
  });

  it("cuts a trailing closing-instruction echo at the sentinel line", () => {
    const raw =
      "Review the diff.\n\nRewrite the prompt now, using only the information " +
      `above, or exactly ${PROMPT_ALREADY_OPTIMAL} if it cannot be improved.`;
    expect(sanitizeOptimizedPrompt(raw)).toBe("Review the diff.");
  });

  it("returns '' when the whole reply is the sentinel", () => {
    expect(sanitizeOptimizedPrompt(PROMPT_ALREADY_OPTIMAL)).toBe("");
  });

  it("leaves a well-formed prompt untouched", () => {
    const md = "You are a reviewer.\n\n- Be concise\n- Cite line numbers";
    expect(sanitizeOptimizedPrompt(md)).toBe(md);
  });

  it("clips very long output on a boundary with an ellipsis", () => {
    const long = `${"word ".repeat(1200)}`.trim();
    const out = sanitizeOptimizedPrompt(long);
    expect(out.length).toBeLessThanOrEqual(MAX_OPTIMIZED_PROMPT_LENGTH + 1);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/wor…$/);
  });
});

describe("stripEchoedTitle", () => {
  it("drops a leading line equal to the title (colon / case tolerant)", () => {
    expect(stripEchoedTitle("Code review prompt\n\nReview the diff.", "Code review prompt")).toBe(
      "Review the diff.",
    );
    expect(stripEchoedTitle("code review prompt:\nReview the diff.", "Code review prompt")).toBe(
      "Review the diff.",
    );
  });

  it("leaves the text alone when the first line is real content", () => {
    const body = "Review the diff for correctness.\n\nOutput a summary.";
    expect(stripEchoedTitle(body, "Code review prompt")).toBe(body);
  });

  it("is a no-op for a blank title", () => {
    expect(stripEchoedTitle("Some prompt body.", "  ")).toBe("Some prompt body.");
  });
});

describe("interpretOptimizeResponse", () => {
  it("treats the sentinel as no change and returns the trimmed original", () => {
    expect(
      interpretOptimizeResponse(PROMPT_ALREADY_OPTIMAL, "  keep me  "),
    ).toEqual({ optimized: "keep me", changed: false });
    // tolerates trailing punctuation / whitespace around the sentinel
    expect(
      interpretOptimizeResponse(`${PROMPT_ALREADY_OPTIMAL}.`, "keep me"),
    ).toEqual({ optimized: "keep me", changed: false });
  });

  it("reports no change when the rewrite matches the original", () => {
    expect(interpretOptimizeResponse("same prompt", "  same prompt  ")).toEqual({
      optimized: "same prompt",
      changed: false,
    });
  });

  it("reports a change for a genuinely different rewrite", () => {
    expect(
      interpretOptimizeResponse("A clearer, sharper prompt.", "vague prompt"),
    ).toEqual({ optimized: "A clearer, sharper prompt.", changed: true });
  });

  it("strips an echoed title line before comparing", () => {
    expect(
      interpretOptimizeResponse(
        "My Prompt\n\nDo the thing, but carefully.",
        "do the thing",
        "My Prompt",
      ),
    ).toEqual({ optimized: "Do the thing, but carefully.", changed: true });
  });

  it("returns an empty result when the model gives nothing usable", () => {
    expect(interpretOptimizeResponse("   ", "vague prompt")).toEqual({
      optimized: "",
      changed: false,
    });
  });
});
