"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Code,
  File as FileIcon,
  FileText,
  Folder,
  Image as ImageIcon,
  Layers,
  Link as LinkIcon,
  Settings,
  Sparkles,
  Star,
  Terminal,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  mockCollections,
  mockItemTypes,
  mockUser,
  type MockCollection,
} from "@/lib/mock-data";

/** Item type id -> icon. Kept here so the sidebar owns its own presentation. */
const TYPE_ICONS: Record<string, LucideIcon> = {
  type_snippet: Code,
  type_prompt: Sparkles,
  type_command: Terminal,
  type_note: FileText,
  type_file: FileIcon,
  type_image: ImageIcon,
  type_link: LinkIcon,
};

/** Mock hex colours mapped to Tailwind classes (no inline styles). */
const TYPE_COLORS: Record<string, string> = {
  "#3b82f6": "text-blue-500",
  "#a855f7": "text-purple-500",
  "#f97316": "text-orange-500",
  "#eab308": "text-yellow-500",
  "#94a3b8": "text-slate-400",
  "#ec4899": "text-pink-500",
  "#14b8a6": "text-teal-500",
};

function typeSlug(name: string) {
  return name.toLowerCase();
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface SidebarProps {
  /** Icon-only rail on desktop when true. */
  collapsed: boolean;
  /** Called when a nav link is followed (used to close the mobile drawer). */
  onNavigate?: () => void;
}

export function Sidebar({ collapsed, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const [typesOpen, setTypesOpen] = useState(true);
  const [collectionsOpen, setCollectionsOpen] = useState(true);

  const favoriteCollections = mockCollections.filter((c) => c.isFavorite);
  const recentCollections = mockCollections.filter((c) => !c.isFavorite);

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
            {mockItemTypes.map((type) => {
              const Icon = TYPE_ICONS[type.id] ?? FileText;
              const href = `/items/${typeSlug(type.name)}`;
              const active = pathname === href;
              return (
                <li key={type.id}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    title={collapsed ? type.name : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      active && "bg-sidebar-accent text-sidebar-foreground",
                      collapsed && "justify-center",
                    )}
                  >
                    <Icon
                      className={cn("size-4 shrink-0", TYPE_COLORS[type.color])}
                    />
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{type.name}</span>
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
              </div>
            )}
          </>
        )}
      </nav>

      {/* User */}
      <div className="shrink-0 border-t border-border p-3">
        <div
          className={cn(
            "flex items-center gap-2.5",
            collapsed && "justify-center",
          )}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
            {initials(mockUser.name)}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{mockUser.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {mockUser.email}
                </p>
              </div>
              <button
                type="button"
                aria-label="Settings"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <Settings className="size-4" />
              </button>
            </>
          )}
        </div>
      </div>
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
  collections: MockCollection[];
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
                <span className="text-xs text-muted-foreground">
                  {collection.itemCount}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
