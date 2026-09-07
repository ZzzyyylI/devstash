import { describe, expect, it } from "vitest";

import { editorPreferencesSchema } from "@/lib/validations/editor-preferences";

const valid = {
  fontSize: 14,
  tabSize: 4,
  wordWrap: true,
  minimap: false,
  theme: "monokai" as const,
};

describe("editorPreferencesSchema", () => {
  it("accepts a well-formed payload unchanged", () => {
    expect(editorPreferencesSchema.parse(valid)).toEqual(valid);
  });

  it("rejects a font size outside the option list", () => {
    const result = editorPreferencesSchema.safeParse({ ...valid, fontSize: 15 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.fontSize?.length).toBeGreaterThan(
        0,
      );
    }
  });

  it("rejects a tab size outside the option list", () => {
    expect(
      editorPreferencesSchema.safeParse({ ...valid, tabSize: 3 }).success,
    ).toBe(false);
  });

  it("rejects an unknown theme", () => {
    expect(
      editorPreferencesSchema.safeParse({ ...valid, theme: "dracula" }).success,
    ).toBe(false);
  });

  it("rejects non-boolean toggles and missing fields", () => {
    expect(
      editorPreferencesSchema.safeParse({ ...valid, wordWrap: "on" }).success,
    ).toBe(false);
    expect(editorPreferencesSchema.safeParse({ fontSize: 14 }).success).toBe(
      false,
    );
  });
});
