import { Pin, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ItemWithType } from "@/lib/db/items";
import { FALLBACK_ICON, palette, TYPE_ICON } from "@/lib/type-presentation";

/** Format a date as e.g. "Jan 15". */
function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** A compact item row used in the Pinned and Recent lists. Display only. */
export function ItemRow({ item }: { item: ItemWithType }) {
  const Icon = TYPE_ICON[item.type.id] ?? FALLBACK_ICON;
  const accent = palette(item.type.color);

  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border border-border border-l-2 bg-card p-4",
        accent.border,
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className={cn("size-4", accent.text)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{item.title}</p>
          {item.isPinned && (
            <Pin className="size-3.5 shrink-0 text-muted-foreground" />
          )}
          {item.isFavorite && (
            <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
          )}
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {formatShortDate(item.updatedAt)}
          </span>
        </div>
        {item.description && (
          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
            {item.description}
          </p>
        )}
        {item.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
