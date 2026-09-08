import {
  CODE_LANGUAGE_OPTIONS,
  codeLanguageSelectValue,
  isKnownCodeLanguage,
} from "@/lib/code-editor";

/** Matches the `<select>` styling used on the settings editor-preferences form. */
const selectClass =
  "h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30";

/**
 * Language picker for the code item forms — a plain `<select>` shown above the
 * Content editor. Selecting a language drives Monaco's syntax highlighting live:
 * the value threads straight through `ItemContentField` → `CodeEditor`.
 *
 * A stored value that isn't one of the known options (a legacy free-text
 * language) is kept as an extra leading option so editing an old item never
 * silently drops it.
 */
export function LanguageSelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const current = codeLanguageSelectValue(value);
  const showCustom = current !== "" && !isKnownCodeLanguage(current);

  return (
    <select
      id={id}
      value={current}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className={selectClass}
    >
      {showCustom && <option value={current}>{current}</option>}
      {CODE_LANGUAGE_OPTIONS.map((option) => (
        <option key={option.value || "plaintext"} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
