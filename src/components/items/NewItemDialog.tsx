"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { createItem } from "@/actions/items";
import { Badge } from "@/components/ui/badge";
import { CREATE_ITEM_TYPES, type CreateItemType } from "@/lib/validations/item";
import { itemTypeFields } from "@/lib/item-type-fields";
import { parseTagsInput } from "@/lib/tags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUpload, type UploadedFile } from "@/components/items/FileUpload";
import { Field } from "@/components/items/item-form/Field";
import { textareaClass } from "@/components/items/item-form/field-styles";
import { ItemContentField } from "@/components/items/item-form/ItemContentField";
import { LanguageSelect } from "@/components/items/item-form/LanguageSelect";
import { CollectionPicker } from "@/components/items/item-form/CollectionPicker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function emptyForm(type: CreateItemType) {
  return {
    type,
    title: "",
    description: "",
    content: "",
    language: "",
    url: "",
    tagsInput: "",
    collectionIds: [] as string[],
    file: null as UploadedFile | null,
  };
}

interface NewItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Type to pre-select each time the dialog opens. Defaults to "snippet". */
  initialType?: CreateItemType;
  /**
   * Whether the signed-in user is on Pro. When `false` the `file` type is
   * disabled with a "Pro" hint — cosmetic only; `createItem` / the upload route
   * are the real gate.
   */
  isPro: boolean;
}

/** Item types that require DevStash Pro. `image` uploads stay free. */
const PRO_ITEM_TYPES = new Set<CreateItemType>(["file"]);

/**
 * "New Item" modal, opened from the top bar or a type page's Add button. A type
 * selector switches which fields show (snippet / command get the code editor);
 * the server action re-validates everything, so the only client-side guards are
 * disabling Submit on an empty title (or an empty URL for a link). On success it
 * toasts, resets, closes, and refreshes the route so the new item shows up in
 * the server-rendered lists.
 */
export function NewItemDialog({
  open,
  onOpenChange,
  initialType = "snippet",
  isPro,
}: NewItemDialogProps) {
  const router = useRouter();

  // A free user can't start on a Pro-only type (e.g. opening "New file" from the
  // /items/file page) — fall back to a snippet.
  const startType =
    !isPro && PRO_ITEM_TYPES.has(initialType) ? "snippet" : initialType;

  const [form, setForm] = useState(() => emptyForm(startType));
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Reset the form (to a blank one pre-selected on `initialType`) whenever the
  // dialog opens or closes — render-phase reset per the React "adjusting state on
  // prop change" pattern.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    setForm(emptyForm(startType));
    setFieldErrors({});
    setPending(false);
  }

  const { showFileUpload, showContent, showLanguage, showUrl } = itemTypeFields(
    form.type,
  );

  const titleEmpty = form.title.trim().length === 0;
  const urlEmpty = form.url.trim().length === 0;
  const submitDisabled =
    pending ||
    titleEmpty ||
    (showUrl && urlEmpty) ||
    (showFileUpload && !form.file);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitDisabled) return;

    setPending(true);
    setFieldErrors({});

    const result = await createItem({
      type: form.type,
      title: form.title,
      description: form.description,
      tags: parseTagsInput(form.tagsInput),
      content: showContent ? form.content : null,
      language: showLanguage ? form.language : null,
      url: showUrl ? form.url : null,
      collectionIds: form.collectionIds,
      fileKey: showFileUpload ? (form.file?.key ?? null) : null,
      fileName: showFileUpload ? (form.file?.name ?? null) : null,
      fileSize: showFileUpload ? (form.file?.size ?? null) : null,
    });

    setPending(false);

    if (!result.success) {
      if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      toast.error(result.error);
      return;
    }

    toast.success("Item created");
    setForm(emptyForm(startType));
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[calc(100vh-2rem)] gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border p-6">
          <DialogTitle>New item</DialogTitle>
          <DialogDescription>
            Add a snippet, prompt, command, note, link, file, or image to your
            stash.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5 overflow-y-auto p-6"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Type</label>
            <div className="flex flex-wrap gap-1.5">
              {CREATE_ITEM_TYPES.map((type) => {
                const locked = !isPro && PRO_ITEM_TYPES.has(type);
                return (
                  <button
                    key={type}
                    type="button"
                    disabled={locked}
                    onClick={() => set("type", type)}
                    aria-pressed={form.type === type}
                    title={
                      locked ? "File uploads are a Pro feature" : undefined
                    }
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-sm capitalize transition-colors",
                      locked
                        ? "cursor-not-allowed border-input text-muted-foreground/60"
                        : "cursor-pointer",
                      !locked && form.type === type
                        ? "border-primary bg-primary/10 text-foreground"
                        : !locked &&
                            "border-input text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {type}
                    {locked && (
                      <Badge
                        variant="outline"
                        className="ml-0.5 px-1 py-0 text-[9px] leading-none"
                      >
                        PRO
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
            {!isPro && (
              <p className="text-xs text-muted-foreground">
                File uploads are a Pro feature.{" "}
                <Link
                  href="/settings"
                  className="font-medium text-foreground underline underline-offset-2"
                >
                  Upgrade
                </Link>
                .
              </p>
            )}
            {fieldErrors.type && fieldErrors.type.length > 0 && (
              <p className="text-xs text-destructive">{fieldErrors.type[0]}</p>
            )}
          </div>

          <Field label="Title" error={fieldErrors.title}>
            <Input
              value={form.title}
              onChange={(event) => set("title", event.target.value)}
              aria-invalid={titleEmpty || Boolean(fieldErrors.title)}
              autoFocus
            />
          </Field>

          <Field label="Description" error={fieldErrors.description}>
            <textarea
              value={form.description}
              onChange={(event) => set("description", event.target.value)}
              rows={2}
              className={textareaClass}
            />
          </Field>

          {showFileUpload && (
            <Field
              label={form.type === "image" ? "Image" : "File"}
              error={fieldErrors.fileKey}
            >
              <FileUpload
                kind={form.type === "image" ? "image" : "file"}
                value={form.file}
                onChange={(next) => set("file", next)}
                disabled={pending}
              />
            </Field>
          )}

          {showLanguage && (
            <Field label="Language" error={fieldErrors.language}>
              <LanguageSelect
                value={form.language}
                onChange={(next) => set("language", next)}
              />
            </Field>
          )}

          {showContent && (
            <ItemContentField
              typeName={form.type}
              value={form.content}
              onChange={(next) => set("content", next)}
              language={form.language}
              error={fieldErrors.content}
            />
          )}

          {showUrl && (
            <Field label="URL" error={fieldErrors.url}>
              <Input
                type="text"
                inputMode="url"
                value={form.url}
                onChange={(event) => set("url", event.target.value)}
                placeholder="https://…"
                aria-invalid={urlEmpty || Boolean(fieldErrors.url)}
              />
            </Field>
          )}

          <Field label="Tags" hint="Comma-separated" error={fieldErrors.tags}>
            <Input
              value={form.tagsInput}
              onChange={(event) => set("tagsInput", event.target.value)}
              placeholder="react, hooks, patterns"
            />
          </Field>

          <CollectionPicker
            selected={form.collectionIds}
            onChange={(ids) => set("collectionIds", ids)}
            disabled={pending}
            error={fieldErrors.collectionIds}
          />

          <DialogFooter className="pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitDisabled}>
              {pending ? "Creating…" : "Create item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
