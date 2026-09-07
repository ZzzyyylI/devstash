import { getAllItems, type ItemWithType } from "@/lib/db/items";
import {
  getSearchCollections,
  type SearchCollection,
} from "@/lib/db/collections";

export interface SearchIndex {
  items: ItemWithType[];
  collections: SearchCollection[];
}

/**
 * The full searchable dataset for the command palette — every item and
 * collection the demo user owns. Fetched once per dashboard render (the layout
 * is `force-dynamic`, so `router.refresh()` after a create/edit/delete re-runs
 * it) and handed to the client, which does all the fuzzy matching in-browser.
 */
export async function getSearchIndex(): Promise<SearchIndex> {
  const [items, collections] = await Promise.all([
    getAllItems(),
    getSearchCollections(),
  ]);

  return { items, collections };
}
