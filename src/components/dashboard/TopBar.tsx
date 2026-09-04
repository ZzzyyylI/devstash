"use client";

import { FolderPlus, PanelLeft, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TopBarProps {
  /** Opens the mobile navigation drawer. */
  onOpenSidebar: () => void;
  /** Collapses / expands the sidebar on desktop. */
  onToggleSidebar: () => void;
}

/**
 * Dashboard top action bar. The search field and New buttons are display only
 * for now — only the sidebar toggle is wired up in phase 2.
 */
export function TopBar({ onOpenSidebar, onToggleSidebar }: TopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onOpenSidebar}
        aria-label="Open sidebar"
      >
        <PanelLeft />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="hidden md:inline-flex"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
      >
        <PanelLeft />
      </Button>

      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search items..."
          disabled
          className="h-9 pr-12 pl-8"
          aria-label="Search items"
        />
        <kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="lg" disabled>
          <FolderPlus />
          New Collection
        </Button>
        <Button size="lg" disabled>
          <Plus />
          New Item
        </Button>
      </div>
    </header>
  );
}
