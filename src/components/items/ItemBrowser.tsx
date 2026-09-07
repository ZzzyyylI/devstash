"use client";

import { cn } from "@/lib/utils";
import type { ItemWithType } from "@/lib/db/items";
import { ItemCard } from "@/components/dashboard/ItemCard";
import { ImageCard } from "@/components/dashboard/ImageCard";
import { ItemRow } from "@/components/dashboard/ItemRow";
import { FileRow } from "@/components/dashboard/FileRow";
import { ItemDrawer } from "@/components/items/ItemDrawer";
import { useItemDrawer } from "@/components/items/use-item-drawer";
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
  const {
    open,
    setOpen,
    summary,
    detail,
    loading,
    error,
    select,
    handleSaved,
    handleDeleted,
  } = useItemDrawer();

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
