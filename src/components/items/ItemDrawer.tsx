"use client";

import { useState } from "react";
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
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { ItemWithType } from "@/lib/db/items";
import { deleteItem, setItemFavorite } from "@/actions/items";
import { isCodeItemType, isMarkdownItemType } from "@/lib/validations/item";
import { FALLBACK_ICON, palette, TYPE_ICON } from "@/lib/type-presentation";
import { CodeEditor } from "@/components/items/CodeEditor";
import { MarkdownEditor } from "@/components/items/MarkdownEditor";
import { ItemEditForm } from "@/components/items/ItemEditForm";
import { FilePreview } from "@/components/items/FilePreview";
import { Section } from "@/components/items/item-drawer/Section";
import { ActionButton } from "@/components/items/item-drawer/ActionButton";
import { DetailSkeleton } from "@/components/items/item-drawer/DetailSkeleton";
import { formatLongDate } from "@/lib/format-date";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import type { ItemDetailJson } from "@/components/items/item-detail-json";

interface ItemDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Card-level data, shown immediately (no fetch needed). */
  summary: ItemWithType | null;
  /** Full detail, fetched on open. `null` while loading. */
  detail: ItemDetailJson | null;
  loading: boolean;
  error: boolean;
  /** Gates the Pro-only "Suggest tags" control in edit mode. */
  isPro: boolean;
  /** Called with the fresh detail after an edit saves. */
  onSaved: (updated: ItemDetailJson) => void;
  /** Called with the item id after it's deleted. */
  onDeleted: (id: string) => void;
}

/**
 * Right-side slide-in item detail view. The header and description render from
 * the card data we already have; the content / collection / details block shows
 * a skeleton until the detail fetch resolves. The pencil action swaps the body
 * for an inline edit form (same drawer, no navigation).
 */
export function ItemDrawer({
  open,
  onOpenChange,
  summary,
  detail,
  loading,
  error,
  isPro,
  onSaved,
  onDeleted,
}: ItemDrawerProps) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [favoritePending, setFavoritePending] = useState(false);
  // Optimistic favorite state while the toggle is in flight (`null` = show the
  // real value). Cleared once the fresh detail lands via `onSaved`.
  const [favoriteOverride, setFavoriteOverride] = useState<boolean | null>(null);

  // Leave edit mode / dismiss the delete prompt whenever the drawer closes or a
  // different item is opened. (Render-phase reset per the React "adjusting state
  // on prop change" pattern.)
  //
  // The key flips to `null` while the drawer is closed, so switching items
  // always resets. The extra `!open` clause is a belt-and-braces guard: if a
  // batched close+reopen ever skips the intermediate closed render, a stale
  // `confirmingDelete` (or `editing`) would otherwise carry into the next item —
  // the reported "delete prompt opens for the next card" symptom.
  const openItemKey = open ? (summary?.id ?? null) : null;
  const [lastOpenItemKey, setLastOpenItemKey] = useState(openItemKey);
  const staleTransientState =
    !open &&
    (editing ||
      confirmingDelete ||
      deleting ||
      favoritePending ||
      favoriteOverride !== null);
  if (openItemKey !== lastOpenItemKey || staleTransientState) {
    setLastOpenItemKey(openItemKey);
    setEditing(false);
    setConfirmingDelete(false);
    setDeleting(false);
    setFavoritePending(false);
    setFavoriteOverride(null);
  }

  async function handleToggleFavorite() {
    if (!summary || !detail || favoritePending) return;

    const next = !detail.isFavorite;
    setFavoritePending(true);
    setFavoriteOverride(next);
    const result = await setItemFavorite(summary.id, next);
    setFavoritePending(false);

    if (!result.success) {
      setFavoriteOverride(null);
      toast.error(result.error);
      return;
    }

    onSaved({
      ...result.data,
      createdAt: new Date(result.data.createdAt).toISOString(),
      updatedAt: new Date(result.data.updatedAt).toISOString(),
    });
    setFavoriteOverride(null);
  }

  async function handleDelete() {
    if (!summary || deleting) return;

    setDeleting(true);
    const result = await deleteItem(summary.id);
    setDeleting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    setConfirmingDelete(false);
    toast.success("Item deleted");
    onDeleted(summary.id);
  }

  const typeId = summary?.type.id;
  const Icon = (typeId && TYPE_ICON[typeId]) || FALLBACK_ICON;
  const accent = palette(summary?.type.color ?? null);
  const isFavorite =
    favoriteOverride ?? detail?.isFavorite ?? summary?.isFavorite ?? false;

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
                  <SheetTitle className="truncate">
                    {editing ? "Edit item" : summary.title}
                  </SheetTitle>
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

              {!editing && (
                <div className="flex items-center gap-1 pt-1">
                  <ActionButton
                    icon={Star}
                    label="Favorite"
                    active={isFavorite}
                    activeIconClass="fill-amber-400 text-amber-400"
                    disabled={!detail || favoritePending}
                    onClick={() => void handleToggleFavorite()}
                  />
                  <ActionButton icon={Pin} label="Pin" active={summary.isPinned} />
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
                    <ActionButton
                      icon={Pencil}
                      label="Edit"
                      disabled={!detail}
                      onClick={() => setEditing(true)}
                    />
                    <ActionButton
                      icon={Trash2}
                      destructive
                      onClick={() => setConfirmingDelete(true)}
                    />
                  </div>
                </div>
              )}
            </SheetHeader>

            <AlertDialog
              open={confirmingDelete}
              onOpenChange={(next) => {
                if (!deleting) setConfirmingDelete(next);
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this item?</AlertDialogTitle>
                  <AlertDialogDescription>
                    &ldquo;{summary.title}&rdquo; will be permanently deleted.
                    This can&apos;t be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    data-variant="destructive"
                    className="bg-destructive/10 text-destructive hover:bg-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30"
                    disabled={deleting}
                    onClick={(event) => {
                      event.preventDefault();
                      void handleDelete();
                    }}
                  >
                    {deleting ? "Deleting…" : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {editing && detail ? (
              <ItemEditForm
                detail={detail}
                isPro={isPro}
                onCancel={() => setEditing(false)}
                onSaved={(updated) => {
                  setEditing(false);
                  onSaved(updated);
                }}
              />
            ) : (
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
                    {detail.fileUrl && <FilePreview detail={detail} />}

                    {detail.content && (
                      <Section title="Content">
                        {isCodeItemType(detail.type.name) ? (
                          <CodeEditor
                            value={detail.content}
                            language={detail.language}
                            readOnly
                          />
                        ) : isMarkdownItemType(detail.type.name) ? (
                          <MarkdownEditor value={detail.content} readOnly />
                        ) : (
                          <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs leading-relaxed">
                            <code>{detail.content}</code>
                          </pre>
                        )}
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

                    {detail.collections.length > 0 && (
                      <Section title="Collections" icon={FolderOpen}>
                        <div className="flex flex-wrap gap-1.5">
                          {detail.collections.map((collection) => (
                            <span
                              key={collection.id}
                              className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                            >
                              {collection.name}
                            </span>
                          ))}
                        </div>
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
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
