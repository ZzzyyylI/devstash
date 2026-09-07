import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";

import { getCollectionById } from "@/lib/db/collections";
import { getItemsByCollection } from "@/lib/db/items";
import { parsePageParam } from "@/lib/pagination";
import { ItemBrowser } from "@/components/items/ItemBrowser";
import { CollectionDetailActions } from "@/components/collections/CollectionDetailActions";
import { Pagination } from "@/components/ui/pagination";

// Reads live data from Neon — don't statically cache it at build time.
export const dynamic = "force-dynamic";

/**
 * A single collection's items (e.g. /collections/abc123). Renders the demo
 * user's items in that collection as a responsive grid of cards, mirroring
 * /items/[type]. Unknown or foreign ids 404.
 */
export default async function CollectionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const [{ id }, { page: pageParam }] = await Promise.all([
    params,
    searchParams,
  ]);
  const collection = await getCollectionById(id);

  if (!collection) {
    notFound();
  }

  const { items, page, pageCount, total } = await getItemsByCollection(
    collection.id,
    parsePageParam(pageParam),
  );

  return (
    <div className="mx-auto max-w-6xl p-6">
      <Link
        href="/collections"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to collections
      </Link>
      <div className="mt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{collection.name}</h1>
            {collection.isFavorite && (
              <Star className="size-4 shrink-0 fill-amber-400 text-amber-400" />
            )}
          </div>
          <CollectionDetailActions collection={collection} />
        </div>
        {collection.description && (
          <p className="mt-1 text-sm text-muted-foreground">
            {collection.description}
          </p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          {total} {total === 1 ? "item" : "items"} in this collection
        </p>
      </div>

      {total === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">
          No items in this collection yet.
        </p>
      ) : (
        <div className="mt-6">
          <ItemBrowser items={items} layout="grid" />
          <Pagination
            page={page}
            pageCount={pageCount}
            basePath={`/collections/${id}`}
          />
        </div>
      )}
    </div>
  );
}
