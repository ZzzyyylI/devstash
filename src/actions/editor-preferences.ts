"use server";

import { parseInput, requireUser } from "@/lib/actions/guards";
import type { ActionResult } from "@/lib/actions/types";
import { updateEditorPreferences as updateEditorPreferencesQuery } from "@/lib/db/editor-preferences";
import { editorPreferencesSchema } from "@/lib/validations/editor-preferences";
import type { EditorPreferences } from "@/lib/editor-preferences";

/**
 * Save the signed-in user's Monaco editor preferences (the settings page
 * auto-saves the full object on every control change). Validates with Zod
 * (source of truth — the form only guards the option lists), requires a session,
 * and returns the normalised, persisted preferences.
 */
export async function updateEditorPreferences(
  input: unknown,
): Promise<ActionResult<EditorPreferences>> {
  const user = await requireUser(
    "You must be signed in to update editor preferences.",
  );
  if (!user.ok) return user.result;

  const parsed = parseInput(
    editorPreferencesSchema,
    input,
    "Please choose valid editor settings.",
  );
  if (!parsed.ok) return parsed.result;

  try {
    const saved = await updateEditorPreferencesQuery(user.value.id, parsed.value);
    return { success: true, data: saved };
  } catch (error) {
    console.error("updateEditorPreferences action failed", error);
    return {
      success: false,
      error: "Something went wrong saving your preferences.",
    };
  }
}
