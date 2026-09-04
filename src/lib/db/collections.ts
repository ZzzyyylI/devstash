import { prisma } from "@/lib/prisma";

// Auth isn't wired up yet — the dashboard shows this single demo user's data,
// matching the seed script (see prisma/seed.ts).
const DEMO_USER_EMAIL = "demo@devstash.io";

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

/** The demo user's most recently updated collections, for the dashboard's Collections section. */
export async function getRecentCollections(
  limit = 6,
): Promise<CollectionWithStats[]> {
  const user = await prisma.user.findUnique({
    where: { email: DEMO_USER_EMAIL },
    select: { id: true },
  });
  if (!user) return [];

  const collections = await prisma.collection.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      items: {
        select: {
          type: { select: { id: true, name: true, icon: true, color: true } },
        },
      },
    },
  });

  return collections.map((collection) => {
    const counts = new Map<string, { type: CollectionItemType; count: number }>();
    for (const item of collection.items) {
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
      itemCount: collection.items.length,
      primaryType: primaryType?.type ?? null,
      types: types.map((entry) => entry.type),
    };
  });
}
