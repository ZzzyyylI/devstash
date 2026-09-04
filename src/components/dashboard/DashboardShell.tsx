"use client";

import { useState } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import type { ItemTypeWithCount } from "@/lib/db/items";
import type { CollectionWithStats } from "@/lib/db/collections";

interface DashboardShellProps {
  children: React.ReactNode;
  /** System (and any custom) item types with live item counts, for the sidebar. */
  itemTypes: ItemTypeWithCount[];
  /** The demo user's collections, for the sidebar. */
  collections: CollectionWithStats[];
}

/**
 * Dashboard layout shell. Owns the sidebar state: a collapsible icon rail on
 * desktop and an off-canvas drawer on mobile.
 */
export function DashboardShell({
  children,
  itemTypes,
  collections,
}: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 border-r border-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <Sidebar
          collapsed={collapsed}
          itemTypes={itemTypes}
          collections={collections}
        />
      </aside>

      {/* Mobile drawer */}
      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out data-[state=open]:fade-in md:hidden" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground shadow-lg outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left md:hidden"
          >
            <Dialog.Title className="sr-only">Sidebar navigation</Dialog.Title>
            <Dialog.Close
              aria-label="Close sidebar"
              className="absolute top-3.5 right-3 z-10 rounded-md p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <X className="size-4" />
            </Dialog.Close>
            <Sidebar
              collapsed={false}
              itemTypes={itemTypes}
              collections={collections}
              onNavigate={() => setMobileOpen(false)}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Main workspace */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          onOpenSidebar={() => setMobileOpen(true)}
          onToggleSidebar={() => setCollapsed((v) => !v)}
        />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
