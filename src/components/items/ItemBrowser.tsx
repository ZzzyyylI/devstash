"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import type { ItemWithType } from "@/lib/db/items";
import { ItemCard } from "@/components/dashboard/ItemCard";
import { ImageCard } from "@/components/dashboard/ImageCard";
import { ItemRow } from "@/components/dashboard/ItemRow";
import { FileRow } from "@/components/dashboard/FileRow";
import { ItemDrawer } from "@/components/items/ItemDrawer";
import type { ItemDetailJson } from "@/components/items/item-detail-json";
import { CopyButton } from "@/components/items/CopyButton";

/** The text a card's quick-copy button copies: the URL for links, else the body. */
function copyableText(item: ItemWithType): string | null {
  const value =
    item.type.name.toLowerCase() === "link" ? item.url : item.content;
  return value && value.trim() ? value : null;
}

interface ItemBrowserProps {
  items: ItemWithType[];
  /**
   * `grid` renders `ItemCard`s (list pages); `gallery` renders `ImageCard`
   * thumbnails (the image type page); `files` renders a `FileRow` list (the
   * file type page); `list` renders `ItemRow`s (dashboard).
   */
  layout: "grid" | "gallery" | "files" | "list";
}

/**
 * Client wrapper that turns a server-rendered list of items into drawer
 * triggers. Card data is passed straight into the drawer; full detail is
 * fetched from `/api/items/[id]` on click and cached for re-opens.
 */
export function ItemBrowser({ items, layout }: ItemBrowserProps) {
  const router = useRouter();
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

  // After an edit saves, refresh the drawer's own state from the returned
  // detail and re-run the server components so the card list reflects the change.
  const handleSaved = useCallback(
    (updated: ItemDetailJson) => {
      cache.current.set(updated.id, updated);
      setDetail(updated);
      setSummary((prev) =>
        prev && prev.id === updated.id
          ? {
              ...prev,
              title: updated.title,
              description: updated.description,
              content: updated.content,
              url: updated.url,
              isFavorite: updated.isFavorite,
              isPinned: updated.isPinned,
              type: updated.type,
              tags: updated.tags,
              updatedAt: new Date(updated.updatedAt),
            }
          : prev,
      );
      router.refresh();
    },
    [router],
  );

  // After a delete, close the drawer, drop the cached detail, and re-run the
  // server components so the card list loses the deleted item.
  const handleDeleted = useCallback(
    (id: string) => {
      cache.current.delete(id);
      setOpen(false);
      router.refresh();
    },
    [router],
  );

  return (
    <>
      <div
        className={cn(
          layout === "list" || layout === "files"
            ? "space-y-3"
            : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
        )}
      >
        {items.map((item) => {
          if (layout === "files") {
            // `FileRow` owns a download link, so it can't be nested in a
            // <button> — it takes the open handler directly instead.
            return (
              <FileRow key={item.id} item={item} onOpen={() => select(item)} />
            );
          }

          if (layout === "gallery") {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => select(item)}
                className="block h-full w-full cursor-pointer rounded-xl text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ImageCard item={item} />
              </button>
            );
          }

          // grid / list: a "stretched link" card (like `FileRow`) so the
          // quick-copy button isn't nested inside the drawer trigger.
          const copyText = copyableText(item);
          return (
            <div
              key={item.id}
              className="group relative h-full cursor-pointer rounded-xl transition-shadow hover:shadow-md"
            >
              <button
                type="button"
                onClick={() => select(item)}
                aria-label={`Open ${item.title}`}
                className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="pointer-events-none relative h-full">
                {layout === "list" ? (
                  <ItemRow item={item} />
                ) : (
                  <ItemCard item={item} />
                )}
              </div>
              {copyText && (
                <CopyButton
                  text={copyText}
                  label={`Copy ${item.title}`}
                  className="pointer-events-auto absolute bottom-3 right-3 z-10 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                />
              )}
            </div>
          );
        })}
      </div>

      <ItemDrawer
        open={open}
        onOpenChange={setOpen}
        summary={summary}
        detail={detail}
        loading={loading}
        error={error}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />
    </>
  );
}
