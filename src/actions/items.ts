"use server";

import { auth } from "@/auth";
import {
  deleteItem as deleteItemQuery,
  updateItem as updateItemQuery,
  type ItemDetail,
} from "@/lib/db/items";
import { updateItemSchema } from "@/lib/validations/item";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

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
