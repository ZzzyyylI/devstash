import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getItemsByType } from "@/lib/db/items";
import { getItemTypeByName } from "@/lib/db/item-types";
import { parsePageParam } from "@/lib/pagination";
import {
  CREATE_ITEM_TYPES,
  type CreateItemType,
} from "@/lib/validations/item";
import { ItemBrowser } from "@/components/items/ItemBrowser";
import { NewTypeItemButton } from "@/components/items/NewTypeItemButton";
import { Pagination } from "@/components/ui/pagination";

// Reads live data from Neon — don't statically cache it at build time.
export const dynamic = "force-dynamic";

/**
 * Type-filtered item list (e.g. /items/snippet). Renders the demo user's items
 * of the resolved type in a responsive grid of cards.
 */
export default async function ItemsByTypePage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const [{ type }, { page: pageParam }] = await Promise.all([
    params,
    searchParams,
  ]);
  const itemType = await getItemTypeByName(type);

  if (!itemType) {
    notFound();
  }

  const { items, page, pageCount, total } = await getItemsByType(
    itemType.id,
    parsePageParam(pageParam),
  );

  const typeKey = itemType.name.toLowerCase();
  const creatableType = (CREATE_ITEM_TYPES as readonly string[]).includes(typeKey)
    ? (typeKey as CreateItemType)
    : null;
  const layout =
    typeKey === "image" ? "gallery" : typeKey === "file" ? "files" : "grid";

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
            {total} {total === 1 ? "item" : "items"} in this type
          </p>
        </div>
        {creatableType && <NewTypeItemButton type={creatableType} />}
      </div>

      {total === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">
          No items of this type yet.
        </p>
      ) : (
        <div className="mt-6">
          <ItemBrowser items={items} layout={layout} />
          <Pagination
            page={page}
            pageCount={pageCount}
            basePath={`/items/${type}`}
          />
        </div>
      )}
    </div>
  );
}
