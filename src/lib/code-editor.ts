/**
 * Maps the free-text `language` label stored on an item to a Monaco language id
 * for the `CodeEditor`. Used only for display/highlighting — an unrecognised
 * value is passed straight through (Monaco falls back to plaintext for ids it
 * doesn't know), and a blank value becomes an explicit `"plaintext"`.
 */

/** Common aliases / shorthands → the Monaco language id we want. */
export const LANGUAGE_ALIASES: Record<string, string> = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  shell: "shell",
  yml: "yaml",
  py: "python",
  rb: "ruby",
  rs: "rust",
  md: "markdown",
  "c++": "cpp",
  "c#": "csharp",
  golang: "go",
};

export function toMonacoLanguage(language: string | null | undefined): string {
  const key = (language ?? "").trim().toLowerCase();
  if (!key) return "plaintext";
  return LANGUAGE_ALIASES[key] ?? key;
}
