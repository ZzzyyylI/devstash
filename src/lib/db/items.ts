import { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { getDemoUserId } from "@/lib/db/user";
import { deleteObject, toObjectKey } from "@/lib/r2";
import {
  ITEMS_PER_PAGE,
  DASHBOARD_RECENT_ITEMS_LIMIT,
  paginate,
  type Paginated,
} from "@/lib/pagination";
import {
  isFileItemType,
  type CreateItemInput,
  type UpdateItemInput,
} from "@/lib/validations/item";

export interface ItemItemType {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

export interface ItemWithType {
  id: string;
  title: string;
  description: string | null;
  /** Text body — set for text items (snippet/prompt/command/note), null for files. */
  content: string | null;
  /** External link — only set for `link` items. */
  url: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  type: ItemItemType;
  tags: string[];
  /** Original upload filename — only set for `file` / `image` items. */
  fileName: string | null;
  /** Upload size in bytes — only set for `file` / `image` items. */
  fileSize: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const ITEM_INCLUDE = {
  type: { select: { id: true, name: true, icon: true, color: true } },
  tags: { include: { tag: { select: { name: true } } } },
} as const;

type ItemRecord = {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  url: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  type: ItemItemType;
  tags: { tag: { name: string } }[];
  fileName: string | null;
  fileSize: number | null;
  createdAt: Date;
  updatedAt: Date;
};

function toItemWithType(item: ItemRecord): ItemWithType {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    content: item.content,
    url: item.url,
    isFavorite: item.isFavorite,
    isPinned: item.isPinned,
    type: item.type,
    tags: item.tags.map(({ tag }) => tag.name),
    fileName: item.fileName,
    fileSize: item.fileSize,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/**
 * Narrow a list of client-supplied collection ids to the ones that actually
 * belong to `userId`. Never trust the ids straight from the form — a caller
 * could otherwise link an item into someone else's collection.
 */
async function ownedCollectionIds(
  userId: string,
  collectionIds: string[],
): Promise<string[]> {
  if (collectionIds.length === 0) return [];

  const owned = await prisma.collection.findMany({
    where: { id: { in: collectionIds }, userId },
    select: { id: true },
  });
  return owned.map((c) => c.id);
}

/** The demo user's pinned items, for the dashboard's Pinned section. */
export async function getPinnedItems(): Promise<ItemWithType[]> {
  const userId = await getDemoUserId();
  if (!userId) return [];

  const items = await prisma.item.findMany({
    where: { userId, isPinned: true },
    orderBy: { updatedAt: "desc" },
    include: ITEM_INCLUDE,
  });

  return items.map(toItemWithType);
}

/** The demo user's most recently updated items, for the dashboard's Recent section. */
export async function getRecentItems(
  limit = DASHBOARD_RECENT_ITEMS_LIMIT,
): Promise<ItemWithType[]> {
  const userId = await getDemoUserId();
  if (!userId) return [];

  const items = await prisma.item.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: ITEM_INCLUDE,
  });

  return items.map(toItemWithType);
}

/**
 * One page of the demo user's items matching `where`, most recently updated
 * first — the shared body of `getItemsByType` and `getItemsByCollection`. Runs
 * the `count` and the page `findMany` together; only `ITEMS_PER_PAGE` rows are
 * fetched, and an out-of-range `requestedPage` is clamped to the last page.
 */
async function getItemsPage(
  where: Prisma.ItemWhereInput,
  requestedPage: number,
): Promise<Paginated<ItemWithType>> {
  const userId = await getDemoUserId();
  if (!userId) return { items: [], page: 1, pageCount: 1, total: 0 };

  const scoped = { ...where, userId };
  const total = await prisma.item.count({ where: scoped });
  const { page, pageCount, skip, take } = paginate(
    total,
    requestedPage,
    ITEMS_PER_PAGE,
  );

  const rows = await prisma.item.findMany({
    where: scoped,
    orderBy: { updatedAt: "desc" },
    skip,
    take,
    include: ITEM_INCLUDE,
  });

  return { items: rows.map(toItemWithType), page, pageCount, total };
}

/**
 * Every one of the demo user's items, most recently updated first — the full
 * dataset the command palette pre-fetches once and fuzzy-searches client-side.
 * Same shape as `getRecentItems`, just without the `take` cap.
 */
export async function getAllItems(): Promise<ItemWithType[]> {
  const userId = await getDemoUserId();
  if (!userId) return [];

  const items = await prisma.item.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: ITEM_INCLUDE,
  });

  return items.map(toItemWithType);
}

/**
 * Every one of the demo user's favorited items, most recently updated first —
 * the item half of the /favorites page. Same card shape as `getRecentItems`,
 * filtered to `isFavorite` and uncapped.
 */
export async function getFavoriteItems(): Promise<ItemWithType[]> {
  const userId = await getDemoUserId();
  if (!userId) return [];

  const items = await prisma.item.findMany({
    where: { userId, isFavorite: true },
    orderBy: { updatedAt: "desc" },
    include: ITEM_INCLUDE,
  });

  return items.map(toItemWithType);
}

/**
 * One page of the demo user's items of a given type, most recently updated
 * first, for the /items/[type] list view.
 */
export async function getItemsByType(
  typeId: string,
  page = 1,
): Promise<Paginated<ItemWithType>> {
  return getItemsPage({ typeId }, page);
}

/**
 * One page of the demo user's items in a given collection, most recently
 * updated first, for the /collections/[id] detail view. Same `getItemsPage`
 * body as `getItemsByType` — only the `where` differs (a `CollectionItem` join
 * filter instead of `typeId`).
 */
export async function getItemsByCollection(
  collectionId: string,
  page = 1,
): Promise<Paginated<ItemWithType>> {
  return getItemsPage({ collections: { some: { collectionId } } }, page);
}

export interface ItemDetail {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  contentType: string;
  language: string | null;
  url: string | null;
  fileName: string | null;
  fileSize: number | null;
  fileUrl: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  type: ItemItemType;
  tags: string[];
  /** Every collection this item belongs to (item ↔ collection is many-to-many). */
  collections: { id: string; name: string }[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Full detail for a single item, for the item drawer. Scoped to the demo user
 * like the rest of this file; returns `null` when the id doesn't match one of
 * their items. The `/api/items/[id]` route adds the signed-in check.
 */
export async function getItemDetail(id: string): Promise<ItemDetail | null> {
  const userId = await getDemoUserId();
  if (!userId) return null;

  const item = await prisma.item.findFirst({
    where: { id, userId },
    include: {
      type: { select: { id: true, name: true, icon: true, color: true } },
      tags: { include: { tag: { select: { name: true } } } },
      collections: {
        include: { collection: { select: { id: true, name: true } } },
        orderBy: { collection: { name: "asc" } },
      },
    },
  });
  if (!item) return null;

  return {
    id: item.id,
    title: item.title,
    description: item.description,
    content: item.content,
    contentType: item.contentType,
    language: item.language,
    url: item.url,
    fileName: item.fileName,
    fileSize: item.fileSize,
    fileUrl: item.fileUrl,
    isFavorite: item.isFavorite,
    isPinned: item.isPinned,
    type: item.type,
    tags: item.tags.map(({ tag }) => tag.name),
    collections: item.collections.map(({ collection }) => collection),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/**
 * Update one of the demo user's items, then return its fresh {@link ItemDetail}
 * so the drawer can refresh without a second request.
 *
 * Scoped to the demo user like the rest of this file — returns `null` when the
 * id isn't one of their items (the caller treats that as "not found"). Tags and
 * collection links are both replaced wholesale: every existing join row is
 * dropped and rebuilt from the payload. Collection ids are filtered to the
 * user's own collections first (see {@link ownedCollectionIds}).
 */
export async function updateItem(
  id: string,
  data: UpdateItemInput,
): Promise<ItemDetail | null> {
  const userId = await getDemoUserId();
  if (!userId) return null;

  const owned = await prisma.item.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!owned) return null;

  const collectionIds = await ownedCollectionIds(userId, data.collectionIds);

  await prisma.item.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description,
      content: data.content,
      url: data.url,
      language: data.language,
      tags: {
        deleteMany: {},
        create: data.tags.map((name) => ({
          tag: {
            connectOrCreate: {
              where: { userId_name: { userId, name } },
              create: { name, userId },
            },
          },
        })),
      },
      collections: {
        deleteMany: {},
        create: collectionIds.map((collectionId) => ({
          collection: { connect: { id: collectionId } },
        })),
      },
    },
  });

  return getItemDetail(id);
}

/**
 * Toggle one of the demo user's items' favorite flag, then return its fresh
 * {@link ItemDetail} so the drawer can reconcile without a second request.
 *
 * Scoped to the demo user like the rest of this file — the ownership check is
 * folded into the `updateMany` `where`, so an unknown or foreign id writes
 * nothing and returns `null` (the caller treats that as "not found").
 */
export async function setItemFavorite(
  id: string,
  isFavorite: boolean,
): Promise<ItemDetail | null> {
  const userId = await getDemoUserId();
  if (!userId) return null;

  const { count } = await prisma.item.updateMany({
    where: { id, userId },
    data: { isFavorite },
  });
  if (count === 0) return null;

  return getItemDetail(id);
}

/**
 * Create an item for the demo user, then return its fresh {@link ItemDetail} so
 * the "New Item" dialog can report success without a second request.
 *
 * Scoped to the demo user like the rest of this file. The `type` name (validated
 * to one of the system types by `createItemSchema`) is resolved to its
 * `ItemType` id; returns `null` when there is no demo user or the type can't be
 * found (the caller treats that as a generic failure). Tags are connect-or-created
 * against the user's tag set, same as `updateItem`.
 *
 * For `file` / `image` items the payload carries a `fileKey` (an R2 object key
 * from `POST /api/upload`) plus the original name and size; those land in
 * `fileUrl` / `fileName` / `fileSize` and `contentType` is `"file"`.
 */
export async function createItem(
  data: CreateItemInput,
): Promise<ItemDetail | null> {
  const userId = await getDemoUserId();
  if (!userId) return null;

  const type = await prisma.itemType.findFirst({
    where: {
      name: { equals: data.type, mode: "insensitive" },
      OR: [{ isSystem: true }, { userId }],
    },
    select: { id: true },
  });
  if (!type) return null;

  const isFile = isFileItemType(data.type);
  const collectionIds = await ownedCollectionIds(userId, data.collectionIds);

  const created = await prisma.item.create({
    data: {
      title: data.title,
      description: data.description,
      content: isFile ? null : data.content,
      url: data.url,
      language: data.language,
      contentType: isFile ? "file" : "text",
      fileUrl: isFile ? (data.fileKey ?? null) : null,
      fileName: isFile ? (data.fileName ?? null) : null,
      fileSize: isFile ? (data.fileSize ?? null) : null,
      userId,
      typeId: type.id,
      tags: {
        create: data.tags.map((name) => ({
          tag: {
            connectOrCreate: {
              where: { userId_name: { userId, name } },
              create: { name, userId },
            },
          },
        })),
      },
      collections: {
        create: collectionIds.map((collectionId) => ({
          collection: { connect: { id: collectionId } },
        })),
      },
    },
    select: { id: true },
  });

  return getItemDetail(created.id);
}

/**
 * Delete one of the demo user's items. Scoped to the demo user like the rest of
 * this file — returns `false` when the id isn't one of their items (the caller
 * treats that as "not found"). The `ItemTag` and `CollectionItem` join rows
 * both cascade-delete with the item (FK `onDelete: Cascade`); the collections
 * themselves are untouched.
 *
 * A `file` / `image` item's backing R2 object is removed too, best-effort — a
 * storage failure is logged but doesn't fail the delete.
 */
export async function deleteItem(id: string): Promise<boolean> {
  const userId = await getDemoUserId();
  if (!userId) return false;

  const owned = await prisma.item.findFirst({
    where: { id, userId },
    select: { id: true, fileUrl: true },
  });
  if (!owned) return false;

  await prisma.item.delete({ where: { id: owned.id } });

  if (owned.fileUrl) {
    await deleteObject(toObjectKey(owned.fileUrl));
  }

  return true;
}

export interface ItemStats {
  total: number;
  favorites: number;
}

/** Item counts for the dashboard's stat cards. */
export async function getItemStats(): Promise<ItemStats> {
  const userId = await getDemoUserId();
  if (!userId) return { total: 0, favorites: 0 };

  const [total, favorites] = await Promise.all([
    prisma.item.count({ where: { userId } }),
    prisma.item.count({ where: { userId, isFavorite: true } }),
  ]);

  return { total, favorites };
}

/**
 * How many items a specific user owns. Explicit `userId` (not `getDemoUserId()`)
 * so the Phase 2 free-plan create gate can pass the session user; also lets a
 * caller that already has the count skip {@link checkItemLimit}'s own query.
 */
export async function getUserItemCount(userId: string): Promise<number> {
  return prisma.item.count({ where: { userId } });
}
