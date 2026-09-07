"use client";

import { createContext, useContext, useRef, useState } from "react";
import { toast } from "sonner";

import { updateEditorPreferences as updateEditorPreferencesAction } from "@/actions/editor-preferences";
import {
  DEFAULT_EDITOR_PREFERENCES,
  type EditorPreferences,
} from "@/lib/editor-preferences";

interface EditorPreferencesContextValue {
  preferences: EditorPreferences;
  /** True while an auto-save round-trip is in flight. */
  saving: boolean;
  /** Optimistically apply a partial change, persist it, toast the outcome. */
  update: (patch: Partial<EditorPreferences>) => Promise<void>;
}

const EditorPreferencesContext =
  createContext<EditorPreferencesContextValue | null>(null);

export function EditorPreferencesProvider({
  initial,
  children,
}: {
  initial: EditorPreferences;
  children: React.ReactNode;
}) {
  const [preferences, setPreferences] = useState<EditorPreferences>(initial);
  const [saving, setSaving] = useState(false);
  // Mirrors the latest optimistic state so back-to-back `update()` calls build
  // `next` from the newest values, not a stale render closure.
  const latest = useRef(preferences);

  async function update(patch: Partial<EditorPreferences>) {
    const rolledBackTo = latest.current;
    const next = { ...latest.current, ...patch };
    latest.current = next;
    setPreferences(next); // optimistic — the editor updates immediately
    setSaving(true);

    const result = await updateEditorPreferencesAction(next);

    setSaving(false);
    if (result.success) {
      // State is already optimistic; re-applying the response would clobber a
      // newer change that landed while this request was in flight.
      toast.success("Editor preferences saved");
    } else {
      latest.current = rolledBackTo;
      setPreferences(rolledBackTo);
      toast.error(result.error);
    }
  }

  return (
    <EditorPreferencesContext.Provider value={{ preferences, saving, update }}>
      {children}
    </EditorPreferencesContext.Provider>
  );
}

/**
 * Strict accessor for the settings form — throws if it's rendered outside the
 * provider (a wiring bug).
 */
export function useEditorPreferences(): EditorPreferencesContextValue {
  const value = useContext(EditorPreferencesContext);
  if (!value) {
    throw new Error(
      "useEditorPreferences must be used within an EditorPreferencesProvider",
    );
  }
  return value;
}

/**
 * Lenient accessor for the `CodeEditor` — returns {@link DEFAULT_EDITOR_PREFERENCES}
 * when there's no provider (e.g. an editor rendered outside the dashboard /
 * settings trees) so the component stays usable on its own.
 */
export function useEditorPreferencesValue(): EditorPreferences {
  return (
    useContext(EditorPreferencesContext)?.preferences ??
    DEFAULT_EDITOR_PREFERENCES
  );
}
