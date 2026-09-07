import { prisma } from "@/lib/prisma";
import { getDemoUserId } from "@/lib/db/user";

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
