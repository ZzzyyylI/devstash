import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";

import { getCollectionById } from "@/lib/db/collections";
import { getItemsByCollection } from "@/lib/db/items";
import { ItemBrowser } from "@/components/items/ItemBrowser";
import { CollectionDetailActions } from "@/components/collections/CollectionDetailActions";

// Reads live data from Neon — don't statically cache it at build time.
export const dynamic = "force-dynamic";

/**
 * A single collection's items (e.g. /collections/abc123). Renders the demo
 * user's items in that collection as a responsive grid of cards, mirroring
 * /items/[type]. Unknown or foreign ids 404.
 */
export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const collection = await getCollectionById(id);

  if (!collection) {
    notFound();
  }

  const items = await getItemsByCollection(collection.id);

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
          {items.length} {items.length === 1 ? "item" : "items"} in this
          collection
        </p>
      </div>

      {items.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">
          No items in this collection yet.
        </p>
      ) : (
        <div className="mt-6">
          <ItemBrowser items={items} layout="grid" />
        </div>
      )}
    </div>
  );
}
