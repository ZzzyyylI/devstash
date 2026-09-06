import { Pin, Star } from "lucide-react";

import type { ItemWithType } from "@/lib/db/items";

/** Format a date as e.g. "Jan 15". */
function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * A gallery thumbnail card for an image item. The thumbnail is served inline by
 * the `/api/files/[id]` proxy, cropped to 16:9 with `object-cover`, and nudges
 * to 105% on hover. Display only.
 */
export function ImageCard({ item }: { item: ItemWithType }) {
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="aspect-video overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element -- same-origin proxy stream, not a static asset */}
        <img
          src={`/api/files/${item.id}`}
          alt={item.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex items-center gap-2 p-3">
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
    </div>
  );
}
