import { z } from "zod";

/**
 * Zod schemas for the AI server-action payloads.
 *
 * Each action re-validates here before calling OpenAI — the create dialog / edit
 * form only pass through whatever the user has typed so far.
 */

/** Trimmed free text where "", whitespace, null and undefined all collapse to null. */
const optionalText = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => (value ?? "").trim() || null);

/**
 * `generateAutoTags` payload. `content` is optional (a link or image item may
 * only have a title + description) and is truncated server-side before the API
 * call.
 */
export const autoTagSchema = z.object({
  title: z.string().trim().min(1, "Add a title first").max(200),
  content: optionalText,
});

/** Validated + normalised auto-tag payload. */
export type AutoTagInput = z.infer<typeof autoTagSchema>;

/**
 * `generateItemDescription` payload. `title` + `type` are required (every form
 * knows both); `content` / `url` / `language` / `description` are whatever the
 * in-progress form happens to hold and collapse to null when blank.
 */
export const describeItemSchema = z.object({
  title: z.string().trim().min(1, "Add a title first").max(200),
  type: z.string().trim().min(1, "Pick an item type").max(50),
  content: optionalText,
  url: optionalText,
  language: optionalText,
  description: optionalText,
});

/** Validated + normalised describe-item payload. */
export type DescribeItemInput = z.infer<typeof describeItemSchema>;

/**
 * `explainCode` payload. `title` + `content` are required (Explain only appears
 * once an item has code to explain); `language` / `type` are whatever the item
 * happens to carry and collapse to null when blank. `content` is truncated
 * server-side before the API call.
 */
export const explainCodeSchema = z.object({
  title: z.string().trim().min(1, "Add a title first").max(200),
  content: z.string().trim().min(1, "There's no code to explain"),
  language: optionalText,
  type: optionalText,
});

/** Validated + normalised explain-code payload. */
export type ExplainCodeInput = z.infer<typeof explainCodeSchema>;

/**
 * `optimizePrompt` payload. `title` + `content` are required (Optimize only
 * appears on a `prompt` item that already has text); `content` is truncated
 * server-side before the API call.
 */
export const optimizePromptSchema = z.object({
  title: z.string().trim().min(1, "Add a title first").max(200),
  content: z.string().trim().min(1, "There's no prompt to optimize"),
});

/** Validated + normalised optimize-prompt payload. */
export type OptimizePromptInput = z.infer<typeof optimizePromptSchema>;
