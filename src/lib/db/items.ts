import { prisma } from "@/lib/prisma";
import { getDemoUserId } from "@/lib/db/user";
import type { CreateItemInput, UpdateItemInput } from "@/lib/validations/item";

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
  isFavorite: boolean;
  isPinned: boolean;
  type: ItemItemType;
  tags: string[];
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
  isFavorite: boolean;
  isPinned: boolean;
  type: ItemItemType;
  tags: { tag: { name: string } }[];
  updatedAt: Date;
};

function toItemWithType(item: ItemRecord): ItemWithType {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    isFavorite: item.isFavorite,
    isPinned: item.isPinned,
    type: item.type,
    tags: item.tags.map(({ tag }) => tag.name),
    updatedAt: item.updatedAt,
  };
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
export async function getRecentItems(limit = 10): Promise<ItemWithType[]> {
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

/** The demo user's items of a given type, most recently updated first, for the /items/[type] list view. */
export async function getItemsByType(typeId: string): Promise<ItemWithType[]> {
  const userId = await getDemoUserId();
  if (!userId) return [];

  const items = await prisma.item.findMany({
    where: { userId, typeId },
    orderBy: { updatedAt: "desc" },
    include: ITEM_INCLUDE,
  });

  return items.map(toItemWithType);
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
  collection: { id: string; name: string } | null;
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
      collection: { select: { id: true, name: true } },
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
    collection: item.collection,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/**
 * Update one of the demo user's items, then return its fresh {@link ItemDetail}
 * so the drawer can refresh without a second request.
 *
 * Scoped to the demo user like the rest of this file — returns `null` when the
 * id isn't one of their items (the caller treats that as "not found"). Tags are
 * replaced wholesale: every existing join row is dropped and the new names are
 * connect-or-created against the user's tag set.
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
    },
  });

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

  const created = await prisma.item.create({
    data: {
      title: data.title,
      description: data.description,
      content: data.content,
      url: data.url,
      language: data.language,
      contentType: "text",
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
    },
    select: { id: true },
  });

  return getItemDetail(created.id);
}

/**
 * Delete one of the demo user's items. Scoped to the demo user like the rest of
 * this file — returns `false` when the id isn't one of their items (the caller
 * treats that as "not found"). The `ItemTag` join rows cascade-delete with the
 * item (FK `onDelete: Cascade`); the item's collection link is `SetNull`, so the
 * collection itself is untouched.
 */
export async function deleteItem(id: string): Promise<boolean> {
  const userId = await getDemoUserId();
  if (!userId) return false;

  const { count } = await prisma.item.deleteMany({ where: { id, userId } });
  return count > 0;
}

/** Display order for the sidebar's Types list (mirrors the old mock data / project spec order). */
export const TYPE_ORDER = [
  "type_snippet",
  "type_prompt",
  "type_command",
  "type_note",
  "type_file",
  "type_image",
  "type_link",
];

/**
 * Sort comparator for item types: known system types in `TYPE_ORDER`, then any
 * custom types alphabetically. Shared by the sidebar and the profile page.
 */
export function compareTypeOrder(
  a: { id: string; name: string },
  b: { id: string; name: string },
): number {
  const orderA = TYPE_ORDER.indexOf(a.id);
  const orderB = TYPE_ORDER.indexOf(b.id);
  if (orderA === -1 && orderB === -1) return a.name.localeCompare(b.name);
  if (orderA === -1) return 1;
  if (orderB === -1) return -1;
  return orderA - orderB;
}

export interface ItemTypeWithCount {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  itemCount: number;
}

/** System item types (plus any of the user's custom ones) with item counts, for the sidebar. */
export async function getItemTypesWithCounts(): Promise<ItemTypeWithCount[]> {
  const userId = await getDemoUserId();

  const types = await prisma.itemType.findMany({
    where: userId ? { OR: [{ isSystem: true }, { userId }] } : { isSystem: true },
  });

  const countByType = userId
    ? new Map(
        (
          await prisma.item.groupBy({
            by: ["typeId"],
            where: { userId },
            _count: { _all: true },
          })
        ).map((entry) => [entry.typeId, entry._count._all]),
      )
    : new Map<string, number>();

  return types
    .map((type) => ({
      id: type.id,
      name: type.name,
      icon: type.icon,
      color: type.color,
      itemCount: countByType.get(type.id) ?? 0,
    }))
    .sort(compareTypeOrder);
}

/** A single item type by name (case-insensitive) with its item count, for the /items/[type] placeholder page. */
export async function getItemTypeByName(
  name: string,
): Promise<ItemTypeWithCount | null> {
  const userId = await getDemoUserId();

  const type = await prisma.itemType.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      ...(userId ? { OR: [{ isSystem: true }, { userId }] } : { isSystem: true }),
    },
  });
  if (!type) return null;

  const itemCount = userId
    ? await prisma.item.count({ where: { userId, typeId: type.id } })
    : 0;

  return {
    id: type.id,
    name: type.name,
    icon: type.icon,
    color: type.color,
    itemCount,
  };
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
