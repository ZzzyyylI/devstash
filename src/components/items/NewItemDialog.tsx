"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { createItem } from "@/actions/items";
import {
  CREATE_ITEM_TYPES,
  type CreateItemType,
  isCodeItemType,
} from "@/lib/validations/item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CodeEditor } from "@/components/items/CodeEditor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Item types that get a Content textarea. */
const CONTENT_TYPES: CreateItemType[] = ["snippet", "prompt", "command", "note"];
/** Item types that get a Language input. */
const LANGUAGE_TYPES: CreateItemType[] = ["snippet", "command"];

function emptyForm(type: CreateItemType) {
  return {
    type,
    title: "",
    description: "",
    content: "",
    language: "",
    url: "",
    tagsInput: "",
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

  const showContent = CONTENT_TYPES.includes(form.type);
  const showLanguage = LANGUAGE_TYPES.includes(form.type);
  const showCodeEditor = isCodeItemType(form.type);
  const showUrl = form.type === "link";

  const titleEmpty = form.title.trim().length === 0;
  const urlEmpty = form.url.trim().length === 0;
  const submitDisabled = pending || titleEmpty || (showUrl && urlEmpty);

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
      tags: form.tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      content: showContent ? form.content : null,
      language: showLanguage ? form.language : null,
      url: showUrl ? form.url : null,
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
            Add a snippet, prompt, command, note, or link to your stash.
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

          {showContent && (
            <Field label="Content" error={fieldErrors.content}>
              {showCodeEditor ? (
                <CodeEditor
                  value={form.content}
                  onChange={(next) => set("content", next)}
                  language={form.language}
                />
              ) : (
                <textarea
                  value={form.content}
                  onChange={(event) => set("content", event.target.value)}
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
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && error.length > 0 && (
        <p className="text-xs text-destructive">{error[0]}</p>
      )}
    </div>
  );
}
