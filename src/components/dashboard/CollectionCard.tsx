import { Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { mockItems, type MockCollection } from "@/lib/mock-data";
import {
  FALLBACK_ICON,
  palette,
  TYPE_ICON,
  typeTextColor,
} from "@/lib/type-presentation";

/** A single collection tile with a colour-coded accent border. Display only. */
export function CollectionCard({ collection }: { collection: MockCollection }) {
  // Distinct item types present in this collection, for the icon strip.
  const typeIds = [
    ...new Set(
      mockItems
        .filter((item) => item.collectionId === collection.id)
        .map((item) => item.typeId),
    ),
  ];

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-border border-l-2 bg-card p-4",
        palette(collection.color).border,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">{collection.name}</h3>
        {collection.isFavorite && (
          <Star className="mt-0.5 size-3.5 shrink-0 fill-amber-400 text-amber-400" />
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {collection.itemCount} items
      </p>
      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
        {collection.description}
      </p>
      {typeIds.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
          {typeIds.map((id) => {
            const Icon = TYPE_ICON[id] ?? FALLBACK_ICON;
            return (
              <Icon key={id} className={cn("size-4", typeTextColor(id))} />
            );
          })}
        </div>
      )}
    </div>
  );
}
