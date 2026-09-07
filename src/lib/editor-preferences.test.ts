import { describe, expect, it } from "vitest";

import {
  DEFAULT_EDITOR_PREFERENCES,
  monacoThemeName,
  normalizeEditorPreferences,
  toMonacoEditorOptions,
} from "@/lib/editor-preferences";

describe("normalizeEditorPreferences", () => {
  it("returns the defaults for null / undefined / non-object input", () => {
    expect(normalizeEditorPreferences(null)).toEqual(DEFAULT_EDITOR_PREFERENCES);
    expect(normalizeEditorPreferences(undefined)).toEqual(
      DEFAULT_EDITOR_PREFERENCES,
    );
    expect(normalizeEditorPreferences("nope")).toEqual(
      DEFAULT_EDITOR_PREFERENCES,
    );
  });

  it("keeps valid values and fills the rest from defaults", () => {
    expect(
      normalizeEditorPreferences({ fontSize: 16, minimap: true }),
    ).toEqual({
      ...DEFAULT_EDITOR_PREFERENCES,
      fontSize: 16,
      minimap: true,
    });
  });

  it("drops out-of-range numbers, wrong types and unknown themes", () => {
    expect(
      normalizeEditorPreferences({
        fontSize: 99,
        tabSize: 3,
        wordWrap: "yes",
        minimap: 1,
        theme: "dracula",
      }),
    ).toEqual(DEFAULT_EDITOR_PREFERENCES);
  });

  it("accepts every allowed theme", () => {
    for (const theme of ["vs-dark", "monokai", "github-dark"] as const) {
      expect(normalizeEditorPreferences({ theme }).theme).toBe(theme);
    }
  });
});

describe("toMonacoEditorOptions", () => {
  it("maps preferences to Monaco option keys", () => {
    expect(
      toMonacoEditorOptions({
        fontSize: 18,
        tabSize: 4,
        wordWrap: true,
        minimap: true,
        theme: "monokai",
      }),
    ).toEqual({
      fontSize: 18,
      lineHeight: Math.round(18 * 1.55),
      tabSize: 4,
      wordWrap: "on",
      minimap: { enabled: true },
    });
  });

  it("maps the word wrap boolean to the Monaco string enum", () => {
    expect(toMonacoEditorOptions(DEFAULT_EDITOR_PREFERENCES).wordWrap).toBe("on");
    expect(
      toMonacoEditorOptions({
        ...DEFAULT_EDITOR_PREFERENCES,
        wordWrap: false,
      }).wordWrap,
    ).toBe("off");
  });
});

describe("monacoThemeName", () => {
  it("namespaces the theme id", () => {
    expect(monacoThemeName("vs-dark")).toBe("devstash-vs-dark");
    expect(monacoThemeName("github-dark")).toBe("devstash-github-dark");
  });
});
