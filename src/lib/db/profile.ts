import { prisma } from "@/lib/prisma";
import { compareTypeOrder } from "@/lib/db/items";

/**
 * Data for the `/profile` page. Unlike the rest of `src/lib/db/*` (which is
 * scoped to the seeded demo user for the dashboard), these helpers take the
 * signed-in user's id — the profile page is always about the current session.
 */

export interface ProfileUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  emailVerified: Date | null;
  isPro: boolean;
  /** True for email/password accounts — gates the "change password" action. */
  hasPassword: boolean;
  createdAt: Date;
}

export async function getProfileUser(
  userId: string,
): Promise<ProfileUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      emailVerified: true,
      isPro: true,
      password: true,
      createdAt: true,
    },
  });
  if (!user) return null;

  const { password, ...rest } = user;
  return { ...rest, hasPassword: password !== null };
}

export interface ProfileTypeCount {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  count: number;
}

export interface ProfileStats {
  totalItems: number;
  totalCollections: number;
  /** One entry per system item type (plus any of the user's custom types). */
  typeBreakdown: ProfileTypeCount[];
}

export async function getProfileStats(userId: string): Promise<ProfileStats> {
  const [totalItems, totalCollections, types, grouped] = await Promise.all([
    prisma.item.count({ where: { userId } }),
    prisma.collection.count({ where: { userId } }),
    prisma.itemType.findMany({
      where: { OR: [{ isSystem: true }, { userId }] },
    }),
    prisma.item.groupBy({
      by: ["typeId"],
      where: { userId },
      _count: { _all: true },
    }),
  ]);

  const countByType = new Map(
    grouped.map((entry) => [entry.typeId, entry._count._all]),
  );

  const typeBreakdown = types
    .map((type) => ({
      id: type.id,
      name: type.name,
      icon: type.icon,
      color: type.color,
      count: countByType.get(type.id) ?? 0,
    }))
    .sort(compareTypeOrder);

  return { totalItems, totalCollections, typeBreakdown };
}
