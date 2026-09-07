import type { Monaco } from "@monaco-editor/react";

import { EDITOR_THEMES, monacoThemeName } from "@/lib/editor-preferences";

/**
 * The three editor themes offered in settings. `vs-dark` is the app-tuned theme
 * that shipped with `CodeEditor`; `monokai` and `github-dark` are compact
 * hand-rolled palettes (Monaco only ships `vs` / `vs-dark` / `hc-*` built in).
 * Each is registered under `devstash-<name>` — see {@link monacoThemeName}.
 */

type ThemeData = Parameters<Monaco["editor"]["defineTheme"]>[1];

const THEME_DATA: Record<(typeof EDITOR_THEMES)[number], ThemeData> = {
  "vs-dark": {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#1e1e1e",
      "editorGutter.background": "#1e1e1e",
      "editorLineNumber.foreground": "#ffffff40",
      "editorLineNumber.activeForeground": "#ffffff99",
      "scrollbarSlider.background": "#ffffff1f",
      "scrollbarSlider.hoverBackground": "#ffffff33",
      "scrollbarSlider.activeBackground": "#ffffff4d",
      "editorOverviewRuler.border": "#00000000",
    },
  },
  monokai: {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "", foreground: "f8f8f2", background: "272822" },
      { token: "comment", foreground: "75715e" },
      { token: "string", foreground: "e6db74" },
      { token: "number", foreground: "ae81ff" },
      { token: "keyword", foreground: "f92672" },
      { token: "type", foreground: "66d9ef", fontStyle: "italic" },
      { token: "function", foreground: "a6e22e" },
      { token: "variable", foreground: "f8f8f2" },
    ],
    colors: {
      "editor.background": "#272822",
      "editorGutter.background": "#272822",
      "editor.foreground": "#f8f8f2",
      "editor.lineHighlightBackground": "#3e3d32",
      "editorLineNumber.foreground": "#90908a",
      "editorLineNumber.activeForeground": "#f8f8f2",
      "editorCursor.foreground": "#f8f8f0",
      "scrollbarSlider.background": "#ffffff1f",
      "scrollbarSlider.hoverBackground": "#ffffff33",
      "scrollbarSlider.activeBackground": "#ffffff4d",
      "editorOverviewRuler.border": "#00000000",
    },
  },
  "github-dark": {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "", foreground: "e6edf3", background: "0d1117" },
      { token: "comment", foreground: "8b949e" },
      { token: "string", foreground: "a5d6ff" },
      { token: "number", foreground: "79c0ff" },
      { token: "keyword", foreground: "ff7b72" },
      { token: "type", foreground: "ffa657" },
      { token: "function", foreground: "d2a8ff" },
      { token: "variable", foreground: "e6edf3" },
    ],
    colors: {
      "editor.background": "#0d1117",
      "editorGutter.background": "#0d1117",
      "editor.foreground": "#e6edf3",
      "editor.lineHighlightBackground": "#161b22",
      "editorLineNumber.foreground": "#6e7681",
      "editorLineNumber.activeForeground": "#e6edf3",
      "editorCursor.foreground": "#e6edf3",
      "scrollbarSlider.background": "#ffffff1f",
      "scrollbarSlider.hoverBackground": "#ffffff33",
      "scrollbarSlider.activeBackground": "#ffffff4d",
      "editorOverviewRuler.border": "#00000000",
    },
  },
};

/** Register all three `devstash-*` themes. Call from Monaco's `beforeMount`. */
export function registerMonacoThemes(monaco: Monaco): void {
  for (const theme of EDITOR_THEMES) {
    monaco.editor.defineTheme(monacoThemeName(theme), THEME_DATA[theme]);
  }
}
