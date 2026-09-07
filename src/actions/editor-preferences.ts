"use server";

import { auth } from "@/auth";
import { updateEditorPreferences as updateEditorPreferencesQuery } from "@/lib/db/editor-preferences";
import { editorPreferencesSchema } from "@/lib/validations/editor-preferences";
import type { EditorPreferences } from "@/lib/editor-preferences";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Save the signed-in user's Monaco editor preferences (the settings page
 * auto-saves the full object on every control change). Validates with Zod
 * (source of truth — the form only guards the option lists), requires a session,
 * and returns the normalised, persisted preferences.
 */
export async function updateEditorPreferences(
  input: unknown,
): Promise<ActionResult<EditorPreferences>> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: "You must be signed in to update editor preferences.",
    };
  }

  const parsed = editorPreferencesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please choose valid editor settings.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const saved = await updateEditorPreferencesQuery(
      session.user.id,
      parsed.data,
    );
    return { success: true, data: saved };
  } catch (error) {
    console.error("updateEditorPreferences action failed", error);
    return {
      success: false,
      error: "Something went wrong saving your preferences.",
    };
  }
}
