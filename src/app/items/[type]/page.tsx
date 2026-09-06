import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getItemsByType, getItemTypeByName } from "@/lib/db/items";
import {
  CREATE_ITEM_TYPES,
  type CreateItemType,
} from "@/lib/validations/item";
import { ItemBrowser } from "@/components/items/ItemBrowser";
import { NewTypeItemButton } from "@/components/items/NewTypeItemButton";

// Reads live data from Neon — don't statically cache it at build time.
export const dynamic = "force-dynamic";

/**
 * Type-filtered item list (e.g. /items/snippet). Renders the demo user's items
 * of the resolved type in a responsive grid of cards.
 */
export default async function ItemsByTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  const itemType = await getItemTypeByName(type);

  if (!itemType) {
    notFound();
  }

  const items = await getItemsByType(itemType.id);

  const typeKey = itemType.name.toLowerCase();
  const creatableType = (CREATE_ITEM_TYPES as readonly string[]).includes(typeKey)
    ? (typeKey as CreateItemType)
    : null;
  const layout = typeKey === "image" ? "gallery" : "grid";

  return (
    <div className="mx-auto max-w-6xl p-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to dashboard
      </Link>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold capitalize">{itemType.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"} in this type
          </p>
        </div>
        {creatableType && <NewTypeItemButton type={creatableType} />}
      </div>

      {items.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">
          No items of this type yet.
        </p>
      ) : (
        <div className="mt-6">
          <ItemBrowser items={items} layout={layout} />
        </div>
      )}
    </div>
  );
}
