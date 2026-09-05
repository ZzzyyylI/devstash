"use client";

import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  Copy,
  FolderOpen,
  Link as LinkIcon,
  Pencil,
  Pin,
  Star,
  Tag,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { ItemDetail, ItemWithType } from "@/lib/db/items";
import { FALLBACK_ICON, palette, TYPE_ICON } from "@/lib/type-presentation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/** `ItemDetail` as it arrives over the wire — `Date`s serialised to strings. */
export type ItemDetailJson = Omit<ItemDetail, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

/** Format a date as e.g. "January 15, 2024". */
function formatLongDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface ItemDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Card-level data, shown immediately (no fetch needed). */
  summary: ItemWithType | null;
  /** Full detail, fetched on open. `null` while loading. */
  detail: ItemDetailJson | null;
  loading: boolean;
  error: boolean;
}

/**
 * Right-side slide-in item detail view. The header and description render from
 * the card data we already have; the content / collection / details block shows
 * a skeleton until the detail fetch resolves.
 */
export function ItemDrawer({
  open,
  onOpenChange,
  summary,
  detail,
  loading,
  error,
}: ItemDrawerProps) {
  const typeId = summary?.type.id;
  const Icon = (typeId && TYPE_ICON[typeId]) || FALLBACK_ICON;
  const accent = palette(summary?.type.color ?? null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        aria-describedby={undefined}
        className="w-full gap-0 p-0 sm:max-w-xl"
      >
        {summary && (
          <>
            <SheetHeader className="gap-3 border-b border-border p-6 pr-12">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className={cn("size-5", accent.text)} />
                </div>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="truncate">{summary.title}</SheetTitle>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs capitalize text-muted-foreground">
                      {summary.type.name}
                    </span>
                    {detail?.language && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        {detail.language}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 pt-1">
                <ActionButton
                  icon={Star}
                  label="Favorite"
                  active={summary.isFavorite}
                  activeIconClass="fill-amber-400 text-amber-400"
                />
                <ActionButton
                  icon={Pin}
                  label="Pin"
                  active={summary.isPinned}
                />
                <ActionButton
                  icon={Copy}
                  label="Copy"
                  onClick={() => {
                    if (detail?.content) {
                      void navigator.clipboard?.writeText(detail.content);
                    }
                  }}
                />
                <div className="ml-auto flex items-center gap-1">
                  <ActionButton icon={Pencil} label="Edit" />
                  <ActionButton icon={Trash2} destructive />
                </div>
              </div>
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
              {summary.description && (
                <Section title="Description">
                  <p className="text-sm text-muted-foreground">
                    {summary.description}
                  </p>
                </Section>
              )}

              {error ? (
                <p className="text-sm text-destructive">
                  Couldn&apos;t load this item. Close the drawer and try again.
                </p>
              ) : loading || !detail ? (
                <DetailSkeleton />
              ) : (
                <>
                  {detail.content && (
                    <Section title="Content">
                      <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs leading-relaxed">
                        <code>{detail.content}</code>
                      </pre>
                    </Section>
                  )}

                  {detail.url && (
                    <Section title="URL" icon={LinkIcon}>
                      <a
                        href={detail.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm break-all text-primary underline-offset-4 hover:underline"
                      >
                        {detail.url}
                      </a>
                    </Section>
                  )}

                  {summary.tags.length > 0 && (
                    <Section title="Tags" icon={Tag}>
                      <div className="flex flex-wrap gap-1.5">
                        {summary.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </Section>
                  )}

                  {detail.collection && (
                    <Section title="Collections" icon={FolderOpen}>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        {detail.collection.name}
                      </span>
                    </Section>
                  )}

                  <Section title="Details" icon={Calendar}>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
                      <dt className="text-muted-foreground">Created</dt>
                      <dd className="text-right">
                        {formatLongDate(detail.createdAt)}
                      </dd>
                      <dt className="text-muted-foreground">Updated</dt>
                      <dd className="text-right">
                        {formatLongDate(detail.updatedAt)}
                      </dd>
                    </dl>
                  </Section>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon && <Icon className="size-3.5" />}
        {title}
      </h3>
      {children}
    </section>
  );
}

function ActionButton({
  icon: Icon,
  label,
  active = false,
  activeIconClass,
  destructive = false,
  onClick,
}: {
  icon: LucideIcon;
  label?: string;
  active?: boolean;
  activeIconClass?: string;
  destructive?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium transition-colors",
        destructive
          ? "text-destructive hover:bg-destructive/10"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        active && !destructive && "text-foreground",
      )}
    >
      <Icon className={cn("size-4", active && activeIconClass)} />
      {label && <span>{label}</span>}
    </button>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-hidden>
      <div className="flex flex-col gap-2">
        <div className="h-3 w-16 rounded bg-muted" />
        <div className="h-24 w-full rounded-lg bg-muted" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-3 w-12 rounded bg-muted" />
        <div className="flex gap-1.5">
          <div className="h-5 w-12 rounded bg-muted" />
          <div className="h-5 w-14 rounded bg-muted" />
          <div className="h-5 w-10 rounded bg-muted" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-3 w-14 rounded bg-muted" />
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="h-4 w-40 rounded bg-muted" />
      </div>
    </div>
  );
}
