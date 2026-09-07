import { prisma } from "@/lib/prisma";
import { getDemoUserId } from "@/lib/db/user";
import {
  COLLECTIONS_PER_PAGE,
  DASHBOARD_COLLECTIONS_LIMIT,
  paginate,
  type Paginated,
} from "@/lib/pagination";
import type {
  CreateCollectionInput,
  UpdateCollectionInput,
} from "@/lib/validations/collection";

export interface CollectionItemType {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

export interface CollectionWithStats {
  id: string;
  name: string;
  description: string | null;
  isFavorite: boolean;
  itemCount: number;
  /** The item type with the most items in this collection, for the card's accent border. */
  primaryType: CollectionItemType | null;
  /** Distinct item types present in this collection, for the icon strip. */
  types: CollectionItemType[];
}

/** Shared query + stat computation behind `getRecentCollections`, `getSidebarCollections` and `getCollectionsPage`. */
async function fetchCollectionsWithStats(
  userId: string,
  range?: { skip?: number; take?: number },
): Promise<CollectionWithStats[]> {
  const collections = await prisma.collection.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    ...(range?.skip ? { skip: range.skip } : {}),
    ...(range?.take ? { take: range.take } : {}),
    include: {
      items: {
        select: {
          item: {
            select: {
              type: {
                select: { id: true, name: true, icon: true, color: true },
              },
            },
          },
        },
      },
    },
  });

  return collections.map((collection) => {
    const items = collection.items.map((link) => link.item);
    const counts = new Map<string, { type: CollectionItemType; count: number }>();
    for (const item of items) {
      const entry = counts.get(item.type.id);
      if (entry) {
        entry.count += 1;
      } else {
        counts.set(item.type.id, { type: item.type, count: 1 });
      }
    }

    const types = [...counts.values()];
    const primaryType = types.reduce<
      { type: CollectionItemType; count: number } | null
    >((max, entry) => (!max || entry.count > max.count ? entry : max), null);

    return {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      isFavorite: collection.isFavorite,
      itemCount: items.length,
      primaryType: primaryType?.type ?? null,
      types: types.map((entry) => entry.type),
    };
  });
}

/** The demo user's most recently updated collections, for the dashboard's Collections section. */
export async function getRecentCollections(
  limit = DASHBOARD_COLLECTIONS_LIMIT,
): Promise<CollectionWithStats[]> {
  const userId = await getDemoUserId();
  if (!userId) return [];

  return fetchCollectionsWithStats(userId, { take: limit });
}

/** All of the demo user's collections, for the sidebar's Favorites/Recent lists. */
export async function getSidebarCollections(): Promise<CollectionWithStats[]> {
  const userId = await getDemoUserId();
  if (!userId) return [];

  return fetchCollectionsWithStats(userId);
}

/**
 * One page of the demo user's collections (with per-card stats), most recently
 * updated first, for the /collections list view. Fetches only `COLLECTIONS_PER_PAGE`
 * rows plus a count; an out-of-range `requestedPage` is clamped to the last page.
 */
export async function getCollectionsPage(
  requestedPage = 1,
): Promise<Paginated<CollectionWithStats>> {
  const userId = await getDemoUserId();
  if (!userId) return { items: [], page: 1, pageCount: 1, total: 0 };

  const total = await prisma.collection.count({ where: { userId } });
  const { page, pageCount, skip, take } = paginate(
    total,
    requestedPage,
    COLLECTIONS_PER_PAGE,
  );

  const items = await fetchCollectionsWithStats(userId, { skip, take });
  return { items, page, pageCount, total };
}

export interface CollectionOption {
  id: string;
  name: string;
}

/**
 * The demo user's collections as `{ id, name }`, ordered by name — for the
 * item form's collection picker. Served by `GET /api/collections`.
 */
export async function getCollectionOptions(): Promise<CollectionOption[]> {
  const userId = await getDemoUserId();
  if (!userId) return [];

  return prisma.collection.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export interface SearchCollection {
  id: string;
  name: string;
  itemCount: number;
}

/**
 * All of the demo user's collections as `{ id, name, itemCount }`, ordered by
 * name — the collection half of the command palette's client-side search index.
 */
export async function getSearchCollections(): Promise<SearchCollection[]> {
  const userId = await getDemoUserId();
  if (!userId) return [];

  const rows = await prisma.collection.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, _count: { select: { items: true } } },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    itemCount: row._count.items,
  }));
}

export interface FavoriteCollection {
  id: string;
  name: string;
  itemCount: number;
  updatedAt: Date;
}

/**
 * All of the demo user's favorited collections, most recently updated first —
 * the collection half of the /favorites page. `itemCount` comes from a `_count`
 * aggregate, same as `getSearchCollections`.
 */
export async function getFavoriteCollections(): Promise<FavoriteCollection[]> {
  const userId = await getDemoUserId();
  if (!userId) return [];

  const rows = await prisma.collection.findMany({
    where: { userId, isFavorite: true },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      updatedAt: true,
      _count: { select: { items: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    itemCount: row._count.items,
    updatedAt: row.updatedAt,
  }));
}

export interface CollectionStats {
  total: number;
  favorites: number;
}

/** Collection counts for the dashboard's stat cards. */
export async function getCollectionStats(): Promise<CollectionStats> {
  const userId = await getDemoUserId();
  if (!userId) return { total: 0, favorites: 0 };

  const [total, favorites] = await Promise.all([
    prisma.collection.count({ where: { userId } }),
    prisma.collection.count({ where: { userId, isFavorite: true } }),
  ]);

  return { total, favorites };
}

/** Just the demo user's collection count, for the /collections placeholder page. */
export async function getCollectionCount(): Promise<number> {
  const userId = await getDemoUserId();
  if (!userId) return 0;

  return prisma.collection.count({ where: { userId } });
}

export interface CollectionSummary {
  id: string;
  name: string;
  description: string | null;
  isFavorite: boolean;
}

/**
 * A single collection by id, scoped to the demo user — `null` when it doesn't
 * exist or belongs to someone else. Backs the /collections/[id] detail page's
 * header; the item list comes from `getItemsByCollection` in `db/items.ts`.
 */
export async function getCollectionById(
  id: string,
): Promise<CollectionSummary | null> {
  const userId = await getDemoUserId();
  if (!userId) return null;

  return prisma.collection.findFirst({
    where: { id, userId },
    select: { id: true, name: true, description: true, isFavorite: true },
  });
}

export interface CreatedCollection {
  id: string;
  name: string;
  description: string | null;
  isFavorite: boolean;
}

/**
 * Create a collection for the demo user from the "New Collection" dialog.
 * User-scoped via `getDemoUserId()` like the rest of this module; returns the
 * new row, or `null` when there's no demo user.
 */
export async function createCollection(
  data: CreateCollectionInput,
): Promise<CreatedCollection | null> {
  const userId = await getDemoUserId();
  if (!userId) return null;

  return prisma.collection.create({
    data: {
      name: data.name,
      description: data.description,
      userId,
    },
    select: { id: true, name: true, description: true, isFavorite: true },
  });
}

/**
 * Update a collection's metadata (name + description) from the "Edit collection"
 * dialog. User-scoped via `getDemoUserId()`; the ownership check is folded into
 * the `updateMany` `where`, so an unknown or foreign id updates nothing and
 * returns `null`. On success returns the fresh row.
 */
export async function updateCollection(
  id: string,
  data: UpdateCollectionInput,
): Promise<CollectionSummary | null> {
  const userId = await getDemoUserId();
  if (!userId) return null;

  const { count } = await prisma.collection.updateMany({
    where: { id, userId },
    data: { name: data.name, description: data.description },
  });
  if (count === 0) return null;

  return prisma.collection.findFirst({
    where: { id, userId },
    select: { id: true, name: true, description: true, isFavorite: true },
  });
}

/**
 * Toggle a collection's favorite flag from the card menu or the detail-page
 * header. User-scoped via `getDemoUserId()`; the ownership check is folded into
 * the `updateMany` `where`, so an unknown or foreign id updates nothing and
 * returns `null`. On success returns the fresh row.
 */
export async function setCollectionFavorite(
  id: string,
  isFavorite: boolean,
): Promise<CollectionSummary | null> {
  const userId = await getDemoUserId();
  if (!userId) return null;

  const { count } = await prisma.collection.updateMany({
    where: { id, userId },
    data: { isFavorite },
  });
  if (count === 0) return null;

  return prisma.collection.findFirst({
    where: { id, userId },
    select: { id: true, name: true, description: true, isFavorite: true },
  });
}

/**
 * Delete a collection. User-scoped via `getDemoUserId()`, with the ownership
 * check in the `deleteMany` `where`. The collection's items are **not** deleted
 * — only the `CollectionItem` join rows, which cascade away. Returns `false` for
 * an unknown or foreign id.
 */
export async function deleteCollection(id: string): Promise<boolean> {
  const userId = await getDemoUserId();
  if (!userId) return false;

  const { count } = await prisma.collection.deleteMany({
    where: { id, userId },
  });
  return count > 0;
}
