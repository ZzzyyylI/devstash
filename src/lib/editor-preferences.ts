/**
 * Editor (Monaco) preferences: the shape stored in `User.editorPreferences`
 * (a JSON column) and the option lists the settings dropdowns render from.
 *
 * Everything here is pure so it can be shared by the server action, the data
 * layer, the React context and the `CodeEditor` component. `normalizeEditorPreferences`
 * is the single gate that turns the untyped JSON blob (or a partial payload)
 * into a complete, valid `EditorPreferences`.
 */

export const EDITOR_THEMES = ["vs-dark", "monokai", "github-dark"] as const;
export type EditorTheme = (typeof EDITOR_THEMES)[number];

export const FONT_SIZE_OPTIONS = [12, 13, 14, 16, 18] as const;
export const TAB_SIZE_OPTIONS = [2, 4, 8] as const;

export const EDITOR_THEME_OPTIONS: { value: EditorTheme; label: string }[] = [
  { value: "vs-dark", label: "VS Dark" },
  { value: "monokai", label: "Monokai" },
  { value: "github-dark", label: "GitHub Dark" },
];

export interface EditorPreferences {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  theme: EditorTheme;
}

export const DEFAULT_EDITOR_PREFERENCES: EditorPreferences = {
  fontSize: 13,
  tabSize: 2,
  wordWrap: true,
  minimap: false,
  theme: "vs-dark",
};

function pickNumber(
  value: unknown,
  allowed: readonly number[],
  fallback: number,
): number {
  return typeof value === "number" && allowed.includes(value) ? value : fallback;
}

function pickBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function pickTheme(value: unknown): EditorTheme {
  return EDITOR_THEMES.includes(value as EditorTheme)
    ? (value as EditorTheme)
    : DEFAULT_EDITOR_PREFERENCES.theme;
}

/**
 * Merge an untyped value (the raw JSON column, or a partial update payload) onto
 * {@link DEFAULT_EDITOR_PREFERENCES}, dropping any field that isn't one of the
 * allowed options. Always returns a complete, valid object.
 */
export function normalizeEditorPreferences(raw: unknown): EditorPreferences {
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  return {
    fontSize: pickNumber(
      source.fontSize,
      FONT_SIZE_OPTIONS,
      DEFAULT_EDITOR_PREFERENCES.fontSize,
    ),
    tabSize: pickNumber(
      source.tabSize,
      TAB_SIZE_OPTIONS,
      DEFAULT_EDITOR_PREFERENCES.tabSize,
    ),
    wordWrap: pickBoolean(source.wordWrap, DEFAULT_EDITOR_PREFERENCES.wordWrap),
    minimap: pickBoolean(source.minimap, DEFAULT_EDITOR_PREFERENCES.minimap),
    theme: pickTheme(source.theme),
  };
}

/** Registered Monaco theme name for a preference value (see `monaco-themes.ts`). */
export function monacoThemeName(theme: EditorTheme): string {
  return `devstash-${theme}`;
}

/**
 * The subset of Monaco `IEditorOptions` driven by user preferences. Spread over
 * the `CodeEditor`'s static options so a preference change re-applies live.
 */
export function toMonacoEditorOptions(preferences: EditorPreferences): {
  fontSize: number;
  lineHeight: number;
  tabSize: number;
  wordWrap: "on" | "off";
  minimap: { enabled: boolean };
} {
  return {
    fontSize: preferences.fontSize,
    lineHeight: Math.round(preferences.fontSize * 1.55),
    tabSize: preferences.tabSize,
    wordWrap: preferences.wordWrap ? "on" : "off",
    minimap: { enabled: preferences.minimap },
  };
}
