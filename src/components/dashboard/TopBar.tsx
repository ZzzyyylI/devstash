"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderPlus, PanelLeft, Plus, Search, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NewItemDialog } from "@/components/items/NewItemDialog";
import { NewCollectionDialog } from "@/components/collections/NewCollectionDialog";
import { CommandPalette } from "@/components/dashboard/CommandPalette";
import type { ItemWithType } from "@/lib/db/items";
import type { SearchCollection } from "@/lib/db/collections";

interface TopBarProps {
  /** Opens the mobile navigation drawer. */
  onOpenSidebar: () => void;
  /** Collapses / expands the sidebar on desktop. */
  onToggleSidebar: () => void;
  /** Pre-fetched item dataset for the command palette. */
  searchItems: ItemWithType[];
  /** Pre-fetched collection dataset for the command palette. */
  searchCollections: SearchCollection[];
}

/**
 * Dashboard top action bar. The search field is a button that opens the Cmd+K
 * command palette; "New Item" / "New Collection" open their create modals.
 *
 * Below the `sm` breakpoint the bar condenses so it never overflows: the search
 * field becomes an icon-only palette trigger and the two create buttons collapse
 * into a single "New" dropdown.
 */
export function TopBar({
  onOpenSidebar,
  onToggleSidebar,
  searchItems,
  searchCollections,
}: TopBarProps) {
  const [newItemOpen, setNewItemOpen] = useState(false);
  const [newCollectionOpen, setNewCollectionOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Global Cmd+K (Mac) / Ctrl+K (Windows) toggles the palette.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 sm:gap-3 sm:px-4">
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 md:hidden"
        onClick={onOpenSidebar}
        aria-label="Open sidebar"
      >
        <PanelLeft />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="hidden shrink-0 md:inline-flex"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
      >
        <PanelLeft />
      </Button>

      {/* Mobile: icon-only palette trigger */}
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 sm:hidden"
        onClick={() => setPaletteOpen(true)}
        aria-label="Search items and collections"
      >
        <Search />
      </Button>

      {/* sm+: full search field */}
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        aria-label="Search items and collections"
        className="relative hidden h-9 w-full max-w-md min-w-0 items-center rounded-md border border-input bg-transparent pr-3 pl-8 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:flex md:pr-12"
      >
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <span className="truncate">Search items...</span>
        <kbd className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium md:block">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Button variant="ghost" size="icon" asChild aria-label="Favorites">
          <Link href="/favorites">
            <Star />
          </Link>
        </Button>

        {/* Mobile: single consolidated "New" menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="lg" className="sm:hidden">
              <Plus />
              New
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setNewItemOpen(true)}>
              <Plus />
              New item
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setNewCollectionOpen(true)}>
              <FolderPlus />
              New collection
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* sm+: separate buttons */}
        <Button
          variant="outline"
          size="lg"
          className="hidden sm:inline-flex"
          onClick={() => setNewCollectionOpen(true)}
        >
          <FolderPlus />
          New Collection
        </Button>
        <Button
          size="lg"
          className="hidden sm:inline-flex"
          onClick={() => setNewItemOpen(true)}
        >
          <Plus />
          New Item
        </Button>
      </div>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        items={searchItems}
        collections={searchCollections}
      />
      <NewItemDialog open={newItemOpen} onOpenChange={setNewItemOpen} />
      <NewCollectionDialog
        open={newCollectionOpen}
        onOpenChange={setNewCollectionOpen}
      />
    </header>
  );
}
