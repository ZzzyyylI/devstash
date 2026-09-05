"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Folder, Layers, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ItemTypeWithCount } from "@/lib/db/items";
import type { CollectionWithStats } from "@/lib/db/collections";
import { FALLBACK_ICON, palette, TYPE_ICON } from "@/lib/type-presentation";
import { Badge } from "@/components/ui/badge";
import {
  SidebarUser,
  type SidebarUserData,
} from "@/components/dashboard/SidebarUser";

const PRO_TYPE_NAMES = new Set(["file", "image"]);

function capitalize(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

interface SidebarProps {
  /** Icon-only rail on desktop when true. */
  collapsed: boolean;
  /** System (and any custom) item types with live item counts, for the Types list. */
  itemTypes: ItemTypeWithCount[];
  /** The demo user's collections, for the Favorites/Recent lists. */
  collections: CollectionWithStats[];
  /** The signed-in user, for the bottom account control. */
  user: SidebarUserData;
  /** Called when a nav link is followed (used to close the mobile drawer). */
  onNavigate?: () => void;
}

export function Sidebar({
  collapsed,
  itemTypes,
  collections,
  user,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const [typesOpen, setTypesOpen] = useState(true);
  const [collectionsOpen, setCollectionsOpen] = useState(true);

  const favoriteCollections = collections.filter((c) => c.isFavorite);
  const recentCollections = collections.filter((c) => !c.isFavorite);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      {/* Brand */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Layers className="size-4" />
        </div>
        {!collapsed && <span className="text-sm font-semibold">DevStash</span>}
      </div>

      {/* Navigation */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        <SectionHeader
          label="Types"
          open={typesOpen}
          collapsed={collapsed}
          onToggle={() => setTypesOpen((v) => !v)}
        />
        {typesOpen && (
          <ul className="mt-1 space-y-0.5">
            {itemTypes.map((type) => {
              const Icon = TYPE_ICON[type.id] ?? FALLBACK_ICON;
              const href = `/items/${type.name.toLowerCase()}`;
              const active = pathname === href;
              return (
                <li key={type.id}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    title={collapsed ? capitalize(type.name) : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      active && "bg-sidebar-accent text-sidebar-foreground",
                      collapsed && "justify-center",
                    )}
                  >
                    <Icon
                      className={cn("size-4 shrink-0", palette(type.color).text)}
                    />
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">
                          {capitalize(type.name)}
                        </span>
                        {PRO_TYPE_NAMES.has(type.name) && (
                          <Badge variant="outline" className="text-[10px]">
                            PRO
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {type.itemCount}
                        </span>
                      </>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {!collapsed && (
          <>
            <div className="my-3 border-t border-border" />
            <SectionHeader
              label="Collections"
              open={collectionsOpen}
              collapsed={collapsed}
              onToggle={() => setCollectionsOpen((v) => !v)}
            />
            {collectionsOpen && (
              <div className="mt-1 space-y-3">
                <CollectionGroup
                  label="Favorites"
                  collections={favoriteCollections}
                  showStar
                />
                <CollectionGroup label="Recent" collections={recentCollections} />
                <Link
                  href="/collections"
                  onClick={onNavigate}
                  className="block px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-sidebar-foreground"
                >
                  View all collections
                </Link>
              </div>
            )}
          </>
        )}
      </nav>

      {/* User */}
      <SidebarUser
        user={user}
        collapsed={collapsed}
        onNavigate={onNavigate}
      />
    </div>
  );
}

interface SectionHeaderProps {
  label: string;
  open: boolean;
  collapsed: boolean;
  onToggle: () => void;
}

function SectionHeader({ label, open, collapsed, onToggle }: SectionHeaderProps) {
  if (collapsed) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between px-2 py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:text-sidebar-foreground"
    >
      {label}
      <ChevronDown
        className={cn("size-3.5 transition-transform", !open && "-rotate-90")}
      />
    </button>
  );
}

interface CollectionGroupProps {
  label: string;
  collections: CollectionWithStats[];
  showStar?: boolean;
}

function CollectionGroup({
  label,
  collections,
  showStar = false,
}: CollectionGroupProps) {
  if (collections.length === 0) return null;
  return (
    <div>
      <p className="px-2 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
        {label}
      </p>
      <ul className="space-y-0.5">
        {collections.map((collection) => (
          <li key={collection.id}>
            <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground">
              <Folder className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{collection.name}</span>
              {showStar ? (
                <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
              ) : (
                <span
                  aria-label={
                    collection.primaryType
                      ? `Mostly ${collection.primaryType.name}`
                      : undefined
                  }
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    palette(collection.primaryType?.color).dot,
                  )}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
