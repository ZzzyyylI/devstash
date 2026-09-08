"use server";

import { parseInput, requireUser, runMutation } from "@/lib/actions/guards";
import type { ActionResult } from "@/lib/actions/types";
import {
  createItem as createItemQuery,
  deleteItem as deleteItemQuery,
  setItemFavorite as setItemFavoriteQuery,
  updateItem as updateItemQuery,
  type ItemDetail,
} from "@/lib/db/items";
import { createItemSchema, updateItemSchema } from "@/lib/validations/item";
import { checkItemLimit, limitErrorMessage } from "@/lib/stripe/limits";

/** Shared guard for the id-only actions (favorite / delete). */
function requireItemId(itemId: string): ActionResult<never> | null {
  if (typeof itemId !== "string" || itemId.length === 0) {
    return { success: false, error: "Missing item id." };
  }
  return null;
}

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
  const user = await requireUser("You must be signed in to create items.");
  if (!user.ok) return user.result;

  const parsed = parseInput(createItemSchema, input);
  if (!parsed.ok) return parsed.result;

  // Free-plan gating. Scoped to the SESSION user (per context/current-feature.md)
  // — correct for real billing. NB: the data-layer write below is still
  // demo-user-scoped, so a signed-in non-demo user's own item count is 0 and
  // this limit is effectively inert until the data layer is session-scoped.
  const limit = await checkItemLimit(user.value.id, user.value.isPro);
  if (!limit.allowed) {
    return { success: false, error: limitErrorMessage("item", limit) };
  }
  if (parsed.value.type === "file" && !user.value.isPro) {
    return {
      success: false,
      error: "File uploads are a Pro feature. Upgrade to attach files.",
    };
  }

  return runMutation("createItem", () => createItemQuery(parsed.value), {
    notFound: "Something went wrong creating the item.",
    failed: "Something went wrong creating the item.",
  });
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
  const user = await requireUser("You must be signed in to edit items.");
  if (!user.ok) return user.result;

  const idError = requireItemId(itemId);
  if (idError) return idError;

  const parsed = parseInput(updateItemSchema, input);
  if (!parsed.ok) return parsed.result;

  return runMutation("updateItem", () => updateItemQuery(itemId, parsed.value), {
    notFound: "Item not found.",
    failed: "Something went wrong saving the item.",
  });
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
  const user = await requireUser("You must be signed in to update items.");
  if (!user.ok) return user.result;

  const idError = requireItemId(itemId);
  if (idError) return idError;

  if (typeof isFavorite !== "boolean") {
    return { success: false, error: "Invalid favorite value." };
  }

  return runMutation(
    "setItemFavorite",
    () => setItemFavoriteQuery(itemId, isFavorite),
    {
      notFound: "Item not found.",
      failed: "Something went wrong updating the item.",
    },
  );
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
  const user = await requireUser("You must be signed in to delete items.");
  if (!user.ok) return user.result;

  const idError = requireItemId(itemId);
  if (idError) return idError;

  return runMutation(
    "deleteItem",
    async () => (await deleteItemQuery(itemId)) && { id: itemId },
    {
      notFound: "Item not found.",
      failed: "Something went wrong deleting the item.",
    },
  );
}
