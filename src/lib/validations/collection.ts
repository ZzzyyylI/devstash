import { z } from "zod";

/**
 * Zod schema for the collection create payload (`POST /api/collections`).
 *
 * The route is the source of truth — the "New Collection" dialog only does a
 * light client-side guard (disable Create on an empty name); every field is
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

export const createCollectionSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: nullableText,
});

/** Validated + normalised create payload. */
export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;

/**
 * The edit payload (`PATCH /api/collections/[id]`). Same shape as create — the
 * "Edit collection" dialog sends the full name + description every save.
 */
export const updateCollectionSchema = createCollectionSchema;

/** Validated + normalised update payload. */
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;

/**
 * The favorite-toggle payload (`PATCH /api/collections/[id]/favorite`). Just the
 * flag — a separate schema so the shared `updateCollectionSchema` (which requires
 * a `name`) doesn't have to be widened to accommodate a partial update.
 */
export const favoriteCollectionSchema = z.object({
  isFavorite: z.boolean(),
});

/** Validated favorite-toggle payload. */
export type FavoriteCollectionInput = z.infer<typeof favoriteCollectionSchema>;
