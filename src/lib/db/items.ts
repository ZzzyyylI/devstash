import { prisma } from "@/lib/prisma";

// Auth isn't wired up yet — the dashboard shows this single demo user's data,
// matching the seed script (see prisma/seed.ts).
const DEMO_USER_EMAIL = "demo@devstash.io";

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

async function getDemoUserId(): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email: DEMO_USER_EMAIL },
    select: { id: true },
  });
  return user?.id ?? null;
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

/** Display order for the sidebar's Types list (mirrors the old mock data / project spec order). */
const TYPE_ORDER = [
  "type_snippet",
  "type_prompt",
  "type_command",
  "type_note",
  "type_file",
  "type_image",
  "type_link",
];

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
    .sort((a, b) => {
      const orderA = TYPE_ORDER.indexOf(a.id);
      const orderB = TYPE_ORDER.indexOf(b.id);
      if (orderA === -1 && orderB === -1) return a.name.localeCompare(b.name);
      if (orderA === -1) return 1;
      if (orderB === -1) return -1;
      return orderA - orderB;
    });
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
