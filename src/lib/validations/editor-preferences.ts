import { z } from "zod";

import {
  EDITOR_THEMES,
  FONT_SIZE_OPTIONS,
  TAB_SIZE_OPTIONS,
} from "@/lib/editor-preferences";

/**
 * Zod schema for the editor-preferences update payload (the `updateEditorPreferences`
 * server action). The settings form auto-saves the full object on every change,
 * so every field is required; each numeric field is pinned to its allowed option
 * list and the theme to {@link EDITOR_THEMES}.
 */
export const editorPreferencesSchema = z.object({
  fontSize: z
    .number()
    .refine(
      (value) => (FONT_SIZE_OPTIONS as readonly number[]).includes(value),
      "Unsupported font size",
    ),
  tabSize: z
    .number()
    .refine(
      (value) => (TAB_SIZE_OPTIONS as readonly number[]).includes(value),
      "Unsupported tab size",
    ),
  wordWrap: z.boolean(),
  minimap: z.boolean(),
  theme: z.enum(EDITOR_THEMES),
});

export type UpdateEditorPreferencesInput = z.infer<typeof editorPreferencesSchema>;
