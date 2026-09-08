import { z } from "zod";

/**
 * Zod schema for the `generateAutoTags` server action payload.
 *
 * The action re-validates here before calling OpenAI — the create dialog / edit
 * form only pass through whatever the user has typed so far. `content` is
 * optional (a link or image item may only have a title + description) and is
 * truncated server-side before the API call.
 */
export const autoTagSchema = z.object({
  title: z.string().trim().min(1, "Add a title first").max(200),
  content: z
    .union([z.string(), z.null()])
    .optional()
    .transform((value) => (value ?? "").trim() || null),
});

/** Validated + normalised auto-tag payload. */
export type AutoTagInput = z.infer<typeof autoTagSchema>;
