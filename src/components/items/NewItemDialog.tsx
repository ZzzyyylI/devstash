"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { createItem } from "@/actions/items";
import { CREATE_ITEM_TYPES, type CreateItemType } from "@/lib/validations/item";
import { itemTypeFields } from "@/lib/item-type-fields";
import { parseTagsInput } from "@/lib/tags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUpload, type UploadedFile } from "@/components/items/FileUpload";
import { Field } from "@/components/items/item-form/Field";
import { textareaClass } from "@/components/items/item-form/field-styles";
import { ItemContentField } from "@/components/items/item-form/ItemContentField";
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
    file: null as UploadedFile | null,
  };
}

interface NewItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Type to pre-select each time the dialog opens. Defaults to "snippet". */
  initialType?: CreateItemType;
}

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
}: NewItemDialogProps) {
  const router = useRouter();

  const [form, setForm] = useState(() => emptyForm(initialType));
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Reset the form (to a blank one pre-selected on `initialType`) whenever the
  // dialog opens or closes — render-phase reset per the React "adjusting state on
  // prop change" pattern.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    setForm(emptyForm(initialType));
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
    setForm(emptyForm(initialType));
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
              {CREATE_ITEM_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => set("type", type)}
                  aria-pressed={form.type === type}
                  className={cn(
                    "cursor-pointer rounded-md border px-2.5 py-1 text-sm capitalize transition-colors",
                    form.type === type
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-input text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
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

          {showContent && (
            <ItemContentField
              typeName={form.type}
              value={form.content}
              onChange={(next) => set("content", next)}
              language={form.language}
              error={fieldErrors.content}
            />
          )}

          {showLanguage && (
            <Field label="Language" error={fieldErrors.language}>
              <Input
                value={form.language}
                onChange={(event) => set("language", event.target.value)}
                placeholder="e.g. typescript"
              />
            </Field>
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
