"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Folder } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ItemWithType } from "@/lib/db/items";
import type { FavoriteCollection } from "@/lib/db/collections";
import { formatShortDate } from "@/lib/format-date";
import { FALLBACK_ICON, palette, TYPE_ICON } from "@/lib/type-presentation";
import {
  DEFAULT_FAVORITE_SORT,
  FAVORITE_SORT_OPTIONS,
  defaultDirForKey,
  sortFavoriteCollections,
  sortFavoriteItems,
  type FavoriteSortKey,
} from "@/lib/favorites-sort";
import { ItemDrawer } from "@/components/items/ItemDrawer";
import { useItemDrawer } from "@/components/items/use-item-drawer";

interface FavoritesListProps {
  items: ItemWithType[];
  collections: FavoriteCollection[];
}

/**
 * The /favorites list: two dense, terminal-style sections (items, collections),
 * each sorted most-recently-favorited first. Item rows open the shared
 * `ItemDrawer`; collection rows navigate to the collection detail page.
 */
export function FavoritesList({ items, collections }: FavoritesListProps) {
  const router = useRouter();
  const drawer = useItemDrawer();
  const [sort, setSort] = useState(DEFAULT_FAVORITE_SORT);

  if (items.length === 0 && collections.length === 0) {
    return (
      <p className="mt-10 font-mono text-sm text-muted-foreground">
        No favorites yet. Star an item to see it here.
      </p>
    );
  }

  const sortedItems = sortFavoriteItems(items, sort.key, sort.dir);
  const sortedCollections = sortFavoriteCollections(
    collections,
    sort.key,
    sort.dir,
  );

  return (
    <>
      <div className="mt-6 flex items-center justify-end gap-2 font-mono text-xs text-muted-foreground">
        <label htmlFor="favorites-sort">Sort</label>
        <select
          id="favorites-sort"
          value={sort.key}
          onChange={(event) => {
            const key = event.target.value as FavoriteSortKey;
            setSort({ key, dir: defaultDirForKey(key) });
          }}
          className="rounded border border-border bg-background px-2 py-1 text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {FAVORITE_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-label={
            sort.dir === "asc"
              ? "Sorted ascending — switch to descending"
              : "Sorted descending — switch to ascending"
          }
          onClick={() =>
            setSort((prev) => ({
              ...prev,
              dir: prev.dir === "asc" ? "desc" : "asc",
            }))
          }
          className="inline-flex size-7 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {sort.dir === "asc" ? (
            <ArrowUp className="size-3.5" />
          ) : (
            <ArrowDown className="size-3.5" />
          )}
        </button>
      </div>

      <div className="mt-4 space-y-8 font-mono">
        {sortedItems.length > 0 && (
          <Section title="Items" count={sortedItems.length}>
            {sortedItems.map((item) => {
              const Icon = TYPE_ICON[item.type.id] ?? FALLBACK_ICON;
              const accent = palette(item.type.color);
              return (
                <Row
                  key={item.id}
                  onSelect={() => drawer.select(item)}
                  icon={<Icon className={cn("size-4 shrink-0", accent.text)} />}
                  title={item.title}
                  badge={item.type.name}
                  date={item.updatedAt}
                />
              );
            })}
          </Section>
        )}

        {sortedCollections.length > 0 && (
          <Section title="Collections" count={sortedCollections.length}>
            {sortedCollections.map((collection) => (
              <Row
                key={collection.id}
                onSelect={() => router.push(`/collections/${collection.id}`)}
                icon={
                  <Folder className="size-4 shrink-0 text-muted-foreground" />
                }
                title={collection.name}
                badge="collection"
                date={collection.updatedAt}
              />
            ))}
          </Section>
        )}
      </div>

      <ItemDrawer
        open={drawer.open}
        onOpenChange={drawer.setOpen}
        summary={drawer.summary}
        detail={drawer.detail}
        loading={drawer.loading}
        error={drawer.error}
        onSaved={drawer.handleSaved}
        onDeleted={drawer.handleDeleted}
      />
    </>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="flex items-baseline gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
        <span className="text-muted-foreground/60">{count}</span>
      </h2>
      <div className="mt-2 border-t border-border">{children}</div>
    </section>
  );
}

function Row({
  onSelect,
  icon,
  title,
  badge,
  date,
}: {
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  badge: string;
  date: Date;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 border-b border-border py-1.5 text-left text-sm transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
    >
      {icon}
      <span className="truncate text-foreground">{title}</span>
      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] tracking-wide text-muted-foreground uppercase">
        {badge}
      </span>
      <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
        {formatShortDate(date)}
      </span>
    </button>
  );
}
