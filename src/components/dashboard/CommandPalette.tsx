"use client";

import { useRouter } from "next/navigation";
import { FolderOpen } from "lucide-react";

import { cn } from "@/lib/utils";
import { commandFilter } from "@/lib/command-filter";
import type { ItemWithType } from "@/lib/db/items";
import type { SearchCollection } from "@/lib/db/collections";
import { FALLBACK_ICON, palette, TYPE_ICON } from "@/lib/type-presentation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ItemDrawer } from "@/components/items/ItemDrawer";
import { useItemDrawer } from "@/components/items/use-item-drawer";

/** First non-empty of content / url / description, whitespace-collapsed and clipped. */
function previewText(item: ItemWithType): string {
  const raw = item.content ?? item.url ?? item.description ?? "";
  return raw.replace(/\s+/g, " ").trim().slice(0, 100);
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The full item dataset, pre-fetched by the dashboard layout. */
  items: ItemWithType[];
  /** The full collection dataset, pre-fetched by the dashboard layout. */
  collections: SearchCollection[];
  /** Whether the signed-in user is on Pro — gates the drawer's "Suggest tags". */
  isPro: boolean;
}

/**
 * Cmd/Ctrl+K command palette. All matching is client-side (cmdk's built-in
 * fuzzy filter over each row's title, type, tags and content preview). Picking
 * an item opens the shared item drawer; picking a collection navigates to it.
 */
export function CommandPalette({
  open,
  onOpenChange,
  items,
  collections,
  isPro,
}: CommandPaletteProps) {
  const router = useRouter();
  const drawer = useItemDrawer();

  function handleSelectItem(item: ItemWithType) {
    onOpenChange(false);
    drawer.select(item);
  }

  function handleSelectCollection(id: string) {
    onOpenChange(false);
    router.push(`/collections/${id}`);
  }

  return (
    <>
      <CommandDialog
        open={open}
        onOpenChange={onOpenChange}
        filter={commandFilter}
      >
        <CommandInput placeholder="Search items and collections…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {items.length > 0 && (
            <CommandGroup heading="Items">
              {items.map((item) => {
                const Icon = TYPE_ICON[item.type.id] ?? FALLBACK_ICON;
                const preview = previewText(item);
                return (
                  <CommandItem
                    key={item.id}
                    value={`${item.title} ${item.id}`}
                    keywords={[item.title, item.type.name, ...item.tags, preview]}
                    onSelect={() => handleSelectItem(item)}
                  >
                    <Icon
                      className={cn("size-4", palette(item.type.color).text)}
                    />
                    <span className="flex-1 truncate">{item.title}</span>
                    {preview && (
                      <span className="hidden max-w-[45%] truncate text-xs text-muted-foreground sm:inline">
                        {preview}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {collections.length > 0 && (
            <CommandGroup heading="Collections">
              {collections.map((collection) => (
                <CommandItem
                  key={collection.id}
                  value={`${collection.name} ${collection.id}`}
                  keywords={[collection.name]}
                  onSelect={() => handleSelectCollection(collection.id)}
                >
                  <FolderOpen className="size-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{collection.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {collection.itemCount}{" "}
                    {collection.itemCount === 1 ? "item" : "items"}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>

      <ItemDrawer
        open={drawer.open}
        onOpenChange={drawer.setOpen}
        summary={drawer.summary}
        detail={drawer.detail}
        loading={drawer.loading}
        error={drawer.error}
        isPro={isPro}
        onSaved={drawer.handleSaved}
        onDeleted={drawer.handleDeleted}
      />
    </>
  );
}
