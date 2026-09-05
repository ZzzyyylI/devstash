"use client";

import { useCallback, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import type { ItemWithType } from "@/lib/db/items";
import { ItemCard } from "@/components/dashboard/ItemCard";
import { ItemRow } from "@/components/dashboard/ItemRow";
import { ItemDrawer, type ItemDetailJson } from "@/components/items/ItemDrawer";

interface ItemBrowserProps {
  items: ItemWithType[];
  /** `grid` renders `ItemCard`s (list pages); `list` renders `ItemRow`s (dashboard). */
  layout: "grid" | "list";
}

/**
 * Client wrapper that turns a server-rendered list of items into drawer
 * triggers. Card data is passed straight into the drawer; full detail is
 * fetched from `/api/items/[id]` on click and cached for re-opens.
 */
export function ItemBrowser({ items, layout }: ItemBrowserProps) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<ItemWithType | null>(null);
  const [detail, setDetail] = useState<ItemDetailJson | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const cache = useRef(new Map<string, ItemDetailJson>());
  const requestId = useRef(0);

  const select = useCallback((item: ItemWithType) => {
    setSummary(item);
    setError(false);
    setOpen(true);

    const cached = cache.current.get(item.id);
    if (cached) {
      setDetail(cached);
      setLoading(false);
      return;
    }

    setDetail(null);
    setLoading(true);
    const id = ++requestId.current;

    fetch(`/api/items/${item.id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { data: ItemDetailJson };
        return body.data;
      })
      .then((data) => {
        cache.current.set(item.id, data);
        if (requestId.current === id) {
          setDetail(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (requestId.current === id) {
          setError(true);
          setLoading(false);
        }
      });
  }, []);

  return (
    <>
      <div
        className={cn(
          layout === "grid"
            ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            : "space-y-3",
        )}
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => select(item)}
            className="block h-full w-full cursor-pointer rounded-xl text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {layout === "grid" ? (
              <ItemCard item={item} />
            ) : (
              <ItemRow item={item} />
            )}
          </button>
        ))}
      </div>

      <ItemDrawer
        open={open}
        onOpenChange={setOpen}
        summary={summary}
        detail={detail}
        loading={loading}
        error={error}
      />
    </>
  );
}
