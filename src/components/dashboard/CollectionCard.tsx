import { Star } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CollectionWithStats } from "@/lib/db/collections";
import { FALLBACK_ICON, palette, TYPE_ICON } from "@/lib/type-presentation";

/** A single collection tile with a colour-coded accent border. Display only. */
export function CollectionCard({
  collection,
}: {
  collection: CollectionWithStats;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-border border-l-2 bg-card p-4",
        palette(collection.primaryType?.color).border,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">{collection.name}</h3>
        {collection.isFavorite && (
          <Star className="mt-0.5 size-3.5 shrink-0 fill-amber-400 text-amber-400" />
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {collection.itemCount} {collection.itemCount === 1 ? "item" : "items"}
      </p>
      {collection.description && (
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
          {collection.description}
        </p>
      )}
      {collection.types.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
          {collection.types.map((type) => {
            const Icon = TYPE_ICON[type.id] ?? FALLBACK_ICON;
            return (
              <Icon
                key={type.id}
                className={cn("size-4", palette(type.color).text)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
