"use client";

import { cn } from "@/lib/utils";
import {
  EDITOR_THEME_OPTIONS,
  FONT_SIZE_OPTIONS,
  TAB_SIZE_OPTIONS,
} from "@/lib/editor-preferences";
import { useEditorPreferences } from "@/components/editor-preferences/EditorPreferencesProvider";

const selectClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30";

function Row({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  id,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-input",
      )}
    >
      <span
        className={cn(
          "inline-block size-4 rounded-full bg-background shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

/**
 * Editor preferences card for the settings page. Every control auto-saves on
 * change through the {@link useEditorPreferences} context (optimistic update +
 * success toast); there is no save button.
 */
export function EditorPreferencesForm() {
  const { preferences, update, saving } = useEditorPreferences();

  return (
    <div className="divide-y divide-border">
      <Row
        label="Font size"
        htmlFor="editor-font-size"
        hint="Code editor text size, in pixels."
      >
        <select
          id="editor-font-size"
          className={selectClass}
          value={preferences.fontSize}
          disabled={saving}
          onChange={(event) => update({ fontSize: Number(event.target.value) })}
        >
          {FONT_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}px
            </option>
          ))}
        </select>
      </Row>

      <Row
        label="Tab size"
        htmlFor="editor-tab-size"
        hint="Spaces per indent level."
      >
        <select
          id="editor-tab-size"
          className={selectClass}
          value={preferences.tabSize}
          disabled={saving}
          onChange={(event) => update({ tabSize: Number(event.target.value) })}
        >
          {TAB_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </Row>

      <Row
        label="Theme"
        htmlFor="editor-theme"
        hint="Color scheme for the code editor."
      >
        <select
          id="editor-theme"
          className={selectClass}
          value={preferences.theme}
          disabled={saving}
          onChange={(event) =>
            update({
              theme: event.target
                .value as (typeof EDITOR_THEME_OPTIONS)[number]["value"],
            })
          }
        >
          {EDITOR_THEME_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Row>

      <Row
        label="Word wrap"
        htmlFor="editor-word-wrap"
        hint="Wrap long lines instead of scrolling horizontally."
      >
        <Toggle
          id="editor-word-wrap"
          checked={preferences.wordWrap}
          disabled={saving}
          onChange={(next) => update({ wordWrap: next })}
        />
      </Row>

      <Row
        label="Minimap"
        htmlFor="editor-minimap"
        hint="Show the code overview on the right edge."
      >
        <Toggle
          id="editor-minimap"
          checked={preferences.minimap}
          disabled={saving}
          onChange={(next) => update({ minimap: next })}
        />
      </Row>
    </div>
  );
}
