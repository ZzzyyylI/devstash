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

export interface CodeLanguageOption {
  /** Stored on the item and passed to Monaco. `""` = plain text / no highlighting. */
  value: string;
  label: string;
}

/**
 * Languages offered by the code item forms' Language dropdown, in display order.
 * Every non-empty `value` is a canonical Monaco language id (so `toMonacoLanguage`
 * passes it straight through); legacy free-text values still resolve via
 * {@link LANGUAGE_ALIASES} at render time.
 */
export const CODE_LANGUAGE_OPTIONS: readonly CodeLanguageOption[] = [
  { value: "", label: "Plain text" },
  { value: "typescript", label: "TypeScript" },
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "java", label: "Java" },
  { value: "kotlin", label: "Kotlin" },
  { value: "swift", label: "Swift" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "shell", label: "Shell / Bash" },
  { value: "sql", label: "SQL" },
  { value: "json", label: "JSON" },
  { value: "yaml", label: "YAML" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "scss", label: "SCSS" },
  { value: "markdown", label: "Markdown" },
  { value: "dockerfile", label: "Dockerfile" },
  { value: "graphql", label: "GraphQL" },
  { value: "xml", label: "XML" },
] as const;

const CODE_LANGUAGE_VALUES = new Set(
  CODE_LANGUAGE_OPTIONS.map((option) => option.value),
);

/** True when `value` is exactly one of the dropdown's option values (`""` included). */
export function isKnownCodeLanguage(value: string): boolean {
  return CODE_LANGUAGE_VALUES.has(value);
}

/**
 * The value the Language `<select>` should show for a stored language string.
 * Resolves a known alias ("bash" → "shell") when it lands on a dropdown option;
 * otherwise returns the trimmed original so a legacy / custom value round-trips.
 */
export function codeLanguageSelectValue(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "";
  if (isKnownCodeLanguage(trimmed)) return trimmed;
  const aliased = LANGUAGE_ALIASES[trimmed.toLowerCase()];
  if (aliased && isKnownCodeLanguage(aliased)) return aliased;
  return trimmed;
}
