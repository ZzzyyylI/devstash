import type { ItemWithType } from "@/lib/db/items";
import type { FavoriteCollection } from "@/lib/db/collections";

/**
 * Client-side sorting for the `/favorites` list. Pure + framework-free so it can
 * be unit-tested; `FavoritesList` holds the `{ key, dir }` state and calls these
 * on every render (the lists are small — no memoisation).
 *
 * Comparators are defined in ascending form; `dir: "desc"` negates the result.
 */

export type FavoriteSortKey = "name" | "date" | "type";
export type SortDir = "asc" | "desc";

export interface FavoriteSort {
  key: FavoriteSortKey;
  dir: SortDir;
}

/** Options for the sort `<select>`, in display order. */
export const FAVORITE_SORT_OPTIONS: { value: FavoriteSortKey; label: string }[] =
  [
    { value: "date", label: "Date" },
    { value: "name", label: "Name" },
    { value: "type", label: "Type" },
  ];

/**
 * The direction a key starts in when it's picked: dates newest-first, text A–Z.
 * Keeps `{ key: "date", dir: "desc" }` (today's order) as the overall default.
 */
export function defaultDirForKey(key: FavoriteSortKey): SortDir {
  return key === "date" ? "desc" : "asc";
}

export const DEFAULT_FAVORITE_SORT: FavoriteSort = {
  key: "date",
  dir: defaultDirForKey("date"),
};

function compareText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

/** Ascending comparator for `items`. */
function itemComparator(
  key: FavoriteSortKey,
): (a: ItemWithType, b: ItemWithType) => number {
  return (a, b) => {
    switch (key) {
      case "name":
        return compareText(a.title, b.title);
      case "type": {
        const byType = compareText(a.type.name, b.type.name);
        return byType !== 0 ? byType : compareText(a.title, b.title);
      }
      case "date":
        return a.updatedAt.getTime() - b.updatedAt.getTime();
    }
  };
}

/** Ascending comparator for `collections` — no type, so `"type"` falls back to name. */
function collectionComparator(
  key: FavoriteSortKey,
): (a: FavoriteCollection, b: FavoriteCollection) => number {
  return (a, b) => {
    if (key === "name" || key === "type") return compareText(a.name, b.name);
    return a.updatedAt.getTime() - b.updatedAt.getTime();
  };
}

/** A new, sorted copy of `items` — never mutates the input. */
export function sortFavoriteItems(
  items: ItemWithType[],
  key: FavoriteSortKey,
  dir: SortDir,
): ItemWithType[] {
  const compare = itemComparator(key);
  const sign = dir === "desc" ? -1 : 1;
  return [...items].sort((a, b) => sign * compare(a, b));
}

/** A new, sorted copy of `collections` — never mutates the input. */
export function sortFavoriteCollections(
  collections: FavoriteCollection[],
  key: FavoriteSortKey,
  dir: SortDir,
): FavoriteCollection[] {
  const compare = collectionComparator(key);
  const sign = dir === "desc" ? -1 : 1;
  return [...collections].sort((a, b) => sign * compare(a, b));
}
