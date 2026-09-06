import { z } from "zod";

/**
 * Zod schema for the item update payload (`updateItem` server action).
 *
 * The action is the source of truth — the drawer's edit form does a light
 * client-side guard (disable Save on an empty title) but every field is
 * re-validated here before the database write.
 */

/** Trimmed free text where "", whitespace, null and undefined all collapse to null. */
const nullableText = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    const trimmed = (value ?? "").trim();
    return trimmed.length > 0 ? trimmed : null;
  });

/**
 * Like {@link nullableText} but preserves internal whitespace (code indentation
 * matters) — only a blank/whitespace-only value collapses to null.
 */
const nullableContent = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    const raw = value ?? "";
    return raw.trim().length > 0 ? raw : null;
  });

/** Optional URL: "" / null / undefined -> null, otherwise must be a valid URL. */
const nullableUrl = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => (value ?? "").trim())
  .refine((value) => value === "" || z.url().safeParse(value).success, {
    message: "Enter a valid URL (including https://)",
  })
  .transform((value) => (value === "" ? null : value));

/** Tags arrive as a string[]; trim, drop blanks, de-dupe (Tag is unique per user+name). */
const tags = z
  .union([z.array(z.string()), z.null()])
  .optional()
  .transform((value) =>
    Array.from(
      new Set((value ?? []).map((tag) => tag.trim()).filter((tag) => tag.length > 0)),
    ),
  )
  .pipe(z.array(z.string()).max(50, "Too many tags (max 50)"));

export const updateItemSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: nullableText,
  content: nullableContent,
  url: nullableUrl,
  language: nullableText,
  tags,
});

/** Validated + normalised update payload. */
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
