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

/** Fields shared by the create and update payloads. */
const itemFields = {
  title: z.string().trim().min(1, "Title is required").max(200),
  description: nullableText,
  content: nullableContent,
  url: nullableUrl,
  language: nullableText,
  tags,
};

export const updateItemSchema = z.object(itemFields);

/** Validated + normalised update payload. */
export type UpdateItemInput = z.infer<typeof updateItemSchema>;

/** Item types offered by the "New Item" dialog. */
export const CREATE_ITEM_TYPES = [
  "snippet",
  "prompt",
  "command",
  "note",
  "link",
  "file",
  "image",
] as const;

export type CreateItemType = (typeof CREATE_ITEM_TYPES)[number];

/** Item types whose payload is an uploaded object rather than text. */
export const FILE_ITEM_TYPES = ["file", "image"] as const;

/** True when an item type is backed by a file/image upload. */
export function isFileItemType(typeName: string): boolean {
  return (FILE_ITEM_TYPES as readonly string[]).includes(
    typeName.trim().toLowerCase(),
  );
}

/** Item types whose content is code — these get the Monaco `CodeEditor` instead of a textarea. */
export const CODE_ITEM_TYPES = ["snippet", "command"] as const;

/** True when an item type's content should render in the code editor. */
export function isCodeItemType(typeName: string): boolean {
  return (CODE_ITEM_TYPES as readonly string[]).includes(
    typeName.trim().toLowerCase(),
  );
}

/** Item types whose content is prose — these get the `MarkdownEditor` instead of a textarea. */
export const MARKDOWN_ITEM_TYPES = ["prompt", "note"] as const;

/** True when an item type's content should render in the Markdown editor. */
export function isMarkdownItemType(typeName: string): boolean {
  return (MARKDOWN_ITEM_TYPES as readonly string[]).includes(
    typeName.trim().toLowerCase(),
  );
}

/**
 * Fields carrying a completed upload — only present for `file` / `image` items.
 * Plain optionals (no normalising transform) so a text item's payload is
 * unchanged: the values come straight from `POST /api/upload`.
 */
const fileFields = {
  /** R2 object key returned by `POST /api/upload`. */
  fileKey: z.string().trim().min(1).nullable().optional(),
  fileName: z.string().trim().min(1).max(255).nullable().optional(),
  fileSize: z.number().int().positive().nullable().optional(),
};

/**
 * Zod schema for the item create payload (`createItem` server action).
 *
 * Same normalised fields as {@link updateItemSchema} plus a required `type`. A
 * `link` item must carry a URL; a `file` / `image` item must carry an uploaded
 * object key.
 */
export const createItemSchema = z
  .object({
    type: z.enum(CREATE_ITEM_TYPES, { message: "Pick an item type" }),
    ...itemFields,
    ...fileFields,
  })
  .refine((data) => data.type !== "link" || data.url !== null, {
    message: "Enter a valid URL (including https://)",
    path: ["url"],
  })
  .refine(
    (data) => !isFileItemType(data.type) || Boolean(data.fileKey),
    {
      message: "Upload a file first",
      path: ["fileKey"],
    },
  );

/** Validated + normalised create payload. */
export type CreateItemInput = z.infer<typeof createItemSchema>;
