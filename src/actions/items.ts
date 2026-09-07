"use server";

import { auth } from "@/auth";
import {
  createItem as createItemQuery,
  deleteItem as deleteItemQuery,
  setItemFavorite as setItemFavoriteQuery,
  updateItem as updateItemQuery,
  type ItemDetail,
} from "@/lib/db/items";
import { createItemSchema, updateItemSchema } from "@/lib/validations/item";
import { checkItemLimit, limitErrorMessage } from "@/lib/stripe/limits";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Create an item from the "New Item" dialog.
 *
 * Validates the payload with Zod (source of truth — the form only does a light
 * client-side guard), requires a signed-in session, and delegates type
 * resolution + the write to `createItem` in `src/lib/db/items.ts` (demo-user
 * scoped, like the rest of the data layer). Returns the fresh `ItemDetail`.
 */
export async function createItem(
  input: unknown,
): Promise<ActionResult<ItemDetail>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in to create items." };
  }

  const parsed = createItemSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // Free-plan gating. Scoped to the SESSION user (per context/current-feature.md)
  // — correct for real billing. NB: the data-layer write below is still
  // demo-user-scoped, so a signed-in non-demo user's own item count is 0 and
  // this limit is effectively inert until the data layer is session-scoped.
  const isPro = Boolean(session.user.isPro);
  const limit = await checkItemLimit(session.user.id, isPro);
  if (!limit.allowed) {
    return { success: false, error: limitErrorMessage("item", limit) };
  }
  if (parsed.data.type === "file" && !isPro) {
    return {
      success: false,
      error: "File uploads are a Pro feature. Upgrade to attach files.",
    };
  }

  try {
    const created = await createItemQuery(parsed.data);
    if (!created) {
      return { success: false, error: "Something went wrong creating the item." };
    }
    return { success: true, data: created };
  } catch (error) {
    console.error("createItem action failed", error);
    return { success: false, error: "Something went wrong creating the item." };
  }
}

/**
 * Update an item from the drawer's edit form.
 *
 * Validates the payload with Zod (source of truth — the form only does a light
 * client-side guard), requires a signed-in session, and delegates ownership +
 * the write to `updateItem` in `src/lib/db/items.ts` (demo-user scoped, like the
 * rest of the data layer). Returns the fresh `ItemDetail` so the drawer can
 * refresh without a second fetch.
 */
export async function updateItem(
  itemId: string,
  input: unknown,
): Promise<ActionResult<ItemDetail>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in to edit items." };
  }

  if (typeof itemId !== "string" || itemId.length === 0) {
    return { success: false, error: "Missing item id." };
  }

  const parsed = updateItemSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const updated = await updateItemQuery(itemId, parsed.data);
    if (!updated) {
      return { success: false, error: "Item not found." };
    }
    return { success: true, data: updated };
  } catch (error) {
    console.error("updateItem action failed", error);
    return { success: false, error: "Something went wrong saving the item." };
  }
}

/**
 * Toggle an item's favorite flag from the drawer's action bar.
 *
 * Requires a signed-in session and delegates ownership + the write to
 * `setItemFavorite` in `src/lib/db/items.ts` (demo-user scoped, like the rest of
 * the data layer). Returns the fresh `ItemDetail` so the drawer reconciles
 * without a second fetch. No Zod schema — the inputs are an id and a boolean.
 */
export async function setItemFavorite(
  itemId: string,
  isFavorite: boolean,
): Promise<ActionResult<ItemDetail>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in to update items." };
  }

  if (typeof itemId !== "string" || itemId.length === 0) {
    return { success: false, error: "Missing item id." };
  }

  if (typeof isFavorite !== "boolean") {
    return { success: false, error: "Invalid favorite value." };
  }

  try {
    const updated = await setItemFavoriteQuery(itemId, isFavorite);
    if (!updated) {
      return { success: false, error: "Item not found." };
    }
    return { success: true, data: updated };
  } catch (error) {
    console.error("setItemFavorite action failed", error);
    return { success: false, error: "Something went wrong updating the item." };
  }
}

/**
 * Delete an item from the drawer's action bar (behind a confirmation dialog).
 *
 * Requires a signed-in session and delegates ownership + the write to
 * `deleteItem` in `src/lib/db/items.ts` (demo-user scoped, like the rest of the
 * data layer). No Zod schema — the only input is the id.
 */
export async function deleteItem(
  itemId: string,
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in to delete items." };
  }

  if (typeof itemId !== "string" || itemId.length === 0) {
    return { success: false, error: "Missing item id." };
  }

  try {
    const deleted = await deleteItemQuery(itemId);
    if (!deleted) {
      return { success: false, error: "Item not found." };
    }
    return { success: true, data: { id: itemId } };
  } catch (error) {
    console.error("deleteItem action failed", error);
    return { success: false, error: "Something went wrong deleting the item." };
  }
}
