/**
 * Item types that are a DevStash Pro feature. Free accounts can't browse or
 * create items of these types — the sidebar badges them "PRO", the create
 * dialog locks them, and the `/items/[type]` list shows an upgrade screen.
 */
export const PRO_ITEM_TYPE_NAMES = new Set(["file", "image"]);

/** Whether a (case-insensitive) item-type name is gated behind Pro. */
export function isProItemType(typeName: string): boolean {
  return PRO_ITEM_TYPE_NAMES.has(typeName.toLowerCase());
}
