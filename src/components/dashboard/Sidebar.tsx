"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Folder, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ItemTypeWithCount } from "@/lib/db/item-types";
import type { CollectionWithStats } from "@/lib/db/collections";
import { FALLBACK_ICON, palette, TYPE_ICON } from "@/lib/type-presentation";
import { Badge } from "@/components/ui/badge";
import {
  SidebarUser,
  type SidebarUserData,
} from "@/components/dashboard/SidebarUser";

const PRO_TYPE_NAMES = new Set(["file", "image"]);

/** Shared layout/interaction classes for a sidebar nav row. */
const ROW_BASE =
  "relative flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";
/** Extra classes applied to the current-page row. */
const ROW_ACTIVE = "bg-sidebar-accent font-medium text-sidebar-foreground";

function capitalize(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** A left accent bar marking the active row, tinted to the given palette dot colour. */
function ActiveBar({ dotClass }: { dotClass: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-full",
        dotClass,
      )}
    />
  );
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
      <Link
        href="/dashboard"
        onClick={onNavigate}
        title={collapsed ? "DevStash" : undefined}
        className={cn(
          "flex h-14 shrink-0 items-center gap-2 border-b border-border px-4 transition-colors hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          collapsed && "justify-center",
        )}
      >
        <Folder className="size-5 shrink-0 text-[#3b82f6]" />
        {!collapsed && <span className="text-sm font-semibold">DevStash</span>}
      </Link>

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
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? capitalize(type.name) : undefined}
                    className={cn(
                      ROW_BASE,
                      active && ROW_ACTIVE,
                      collapsed && "justify-center",
                    )}
                  >
                    {active && <ActiveBar dotClass={palette(type.color).dot} />}
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
                  pathname={pathname}
                  onNavigate={onNavigate}
                  showStar
                />
                <CollectionGroup
                  label="Recent"
                  collections={recentCollections}
                  pathname={pathname}
                  onNavigate={onNavigate}
                />
                <Link
                  href="/collections"
                  onClick={onNavigate}
                  aria-current={pathname === "/collections" ? "page" : undefined}
                  className={cn(
                    "block rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    pathname === "/collections" && "font-medium text-sidebar-foreground",
                  )}
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
  pathname: string;
  onNavigate?: () => void;
  showStar?: boolean;
}

function CollectionGroup({
  label,
  collections,
  pathname,
  onNavigate,
  showStar = false,
}: CollectionGroupProps) {
  if (collections.length === 0) return null;
  return (
    <div>
      <p className="px-2 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
        {label}
      </p>
      <ul className="space-y-0.5">
        {collections.map((collection) => {
          const href = `/collections/${collection.id}`;
          const active = pathname === href;
          return (
            <li key={collection.id}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(ROW_BASE, active && ROW_ACTIVE)}
              >
                {active && (
                  <ActiveBar
                    dotClass={palette(collection.primaryType?.color).dot}
                  />
                )}
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
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
