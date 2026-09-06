"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  Copy,
  Download,
  FileText,
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
import type { ItemDetail, ItemWithType } from "@/lib/db/items";
import { deleteItem, updateItem } from "@/actions/items";
import { isCodeItemType, isMarkdownItemType } from "@/lib/validations/item";
import { formatBytes } from "@/lib/file-constraints";
import { FALLBACK_ICON, palette, TYPE_ICON } from "@/lib/type-presentation";
import { CodeEditor } from "@/components/items/CodeEditor";
import { MarkdownEditor } from "@/components/items/MarkdownEditor";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

/** Item type names that get a Content textarea in the edit form. */
const CONTENT_TYPES = ["snippet", "prompt", "command", "note"];
/** Item type names that get a Language input in the edit form. */
const LANGUAGE_TYPES = ["snippet", "command"];

interface ItemDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Card-level data, shown immediately (no fetch needed). */
  summary: ItemWithType | null;
  /** Full detail, fetched on open. `null` while loading. */
  detail: ItemDetailJson | null;
  loading: boolean;
  error: boolean;
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
  onSaved,
  onDeleted,
}: ItemDrawerProps) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Leave edit mode / dismiss the delete prompt whenever the drawer closes or a
  // different item is opened. (Render-phase reset per the React "adjusting state
  // on prop change" pattern.)
  const openItemKey = open ? (summary?.id ?? null) : null;
  const [lastOpenItemKey, setLastOpenItemKey] = useState(openItemKey);
  if (openItemKey !== lastOpenItemKey) {
    setLastOpenItemKey(openItemKey);
    setEditing(false);
    setConfirmingDelete(false);
    setDeleting(false);
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
                    {detail.fileUrl && (
                      <FilePreview detail={detail} />
                    )}

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
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/**
 * Inline edit form — replaces the action bar (with Save / Cancel) and the detail
 * body (with editable fields). Type-specific fields (Content / Language / URL)
 * show only for the relevant item type. The server action re-validates
 * everything; the only client-side guard is disabling Save on an empty title.
 */
function ItemEditForm({
  detail,
  onCancel,
  onSaved,
}: {
  detail: ItemDetailJson;
  onCancel: () => void;
  onSaved: (updated: ItemDetailJson) => void;
}) {
  const typeName = detail.type.name.toLowerCase();
  const showContent = CONTENT_TYPES.includes(typeName);
  const showLanguage = LANGUAGE_TYPES.includes(typeName);
  const showCodeEditor = isCodeItemType(typeName);
  const showMarkdownEditor = isMarkdownItemType(typeName);
  const showUrl = typeName === "link";

  const [title, setTitle] = useState(detail.title);
  const [description, setDescription] = useState(detail.description ?? "");
  const [tagsInput, setTagsInput] = useState(detail.tags.join(", "));
  const [content, setContent] = useState(detail.content ?? "");
  const [language, setLanguage] = useState(detail.language ?? "");
  const [url, setUrl] = useState(detail.url ?? "");
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const titleEmpty = title.trim().length === 0;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending || titleEmpty) return;

    setPending(true);
    setFieldErrors({});

    const result = await updateItem(detail.id, {
      title,
      description,
      tags: tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      content: showContent ? content : null,
      language: showLanguage ? language : null,
      url: showUrl ? url : null,
    });

    setPending(false);

    if (!result.success) {
      if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      toast.error(result.error);
      return;
    }

    const data = result.data;
    toast.success("Item updated");
    onSaved({
      ...data,
      createdAt: new Date(data.createdAt).toISOString(),
      updatedAt: new Date(data.updatedAt).toISOString(),
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-1 flex-col overflow-hidden"
    >
      <div className="flex items-center gap-2 border-b border-border px-6 py-3">
        <Button type="submit" size="sm" disabled={pending || titleEmpty}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
        <Field label="Title" error={fieldErrors.title}>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-invalid={titleEmpty || Boolean(fieldErrors.title)}
            autoFocus
          />
        </Field>

        <Field label="Description" error={fieldErrors.description}>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className={textareaClass}
          />
        </Field>

        {showContent && (
          <Field label="Content" error={fieldErrors.content}>
            {showCodeEditor ? (
              <CodeEditor
                value={content}
                onChange={setContent}
                language={language}
              />
            ) : showMarkdownEditor ? (
              <MarkdownEditor value={content} onChange={setContent} />
            ) : (
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={8}
                className={cn(
                  textareaClass,
                  "font-mono text-xs leading-relaxed",
                )}
              />
            )}
          </Field>
        )}

        {showLanguage && (
          <Field label="Language" error={fieldErrors.language}>
            <Input
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              placeholder="e.g. typescript"
            />
          </Field>
        )}

        {showUrl && (
          <Field label="URL" error={fieldErrors.url}>
            <Input
              type="text"
              inputMode="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://…"
              aria-invalid={Boolean(fieldErrors.url)}
            />
          </Field>
        )}

        <Field
          label="Tags"
          hint="Comma-separated"
          error={fieldErrors.tags}
        >
          <Input
            value={tagsInput}
            onChange={(event) => setTagsInput(event.target.value)}
            placeholder="react, hooks, patterns"
          />
        </Field>
      </div>
    </form>
  );
}

const textareaClass =
  "w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive dark:bg-input/30";

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-sm font-medium">{label}</label>
        {hint && (
          <span className="text-xs text-muted-foreground">{hint}</span>
        )}
      </div>
      {children}
      {error && error.length > 0 && (
        <p className="text-xs text-destructive">{error[0]}</p>
      )}
    </div>
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

/**
 * Readonly preview for a `file` / `image` item. Images render inline from the
 * `/api/files/[id]` proxy; files show name + size. Both get a Download button
 * that hits the same proxy with `?download=1` (attachment disposition).
 */
function FilePreview({ detail }: { detail: ItemDetailJson }) {
  const isImage = detail.type.name.toLowerCase() === "image";
  const src = `/api/files/${detail.id}`;

  return (
    <Section title={isImage ? "Image" : "File"} icon={FileText}>
      {isImage ? (
        <a href={src} target="_blank" rel="noreferrer" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={detail.fileName ?? detail.title}
            className="max-h-80 w-auto rounded-lg border border-border object-contain"
          />
        </a>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-border p-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
            <FileText className="size-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {detail.fileName ?? detail.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(detail.fileSize)}
            </p>
          </div>
        </div>
      )}

      <a
        href={`${src}?download=1`}
        className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Download className="size-4" />
        Download{detail.fileSize ? ` (${formatBytes(detail.fileSize)})` : ""}
      </a>
    </Section>
  );
}

function ActionButton({
  icon: Icon,
  label,
  active = false,
  activeIconClass,
  destructive = false,
  disabled = false,
  onClick,
}: {
  icon: LucideIcon;
  label?: string;
  active?: boolean;
  activeIconClass?: string;
  destructive?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium transition-colors",
        destructive
          ? "text-destructive hover:bg-destructive/10"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        active && !destructive && "text-foreground",
        disabled && "pointer-events-none opacity-40",
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
