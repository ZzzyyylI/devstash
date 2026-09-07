"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { postJson } from "@/lib/post-json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/items/item-form/Field";
import { textareaClass } from "@/components/items/item-form/field-styles";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function emptyForm() {
  return { name: "", description: "" };
}

interface NewCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * "New Collection" modal, opened from the top bar. Posts to `POST /api/collections`
 * (the route re-validates everything, so the only client-side guard is disabling
 * Create on an empty name). On success it toasts, resets, closes, and refreshes
 * the route so the new collection shows up in the server-rendered sidebar,
 * dashboard Collections section, and stat cards.
 */
export function NewCollectionDialog({
  open,
  onOpenChange,
}: NewCollectionDialogProps) {
  const router = useRouter();

  const [form, setForm] = useState(emptyForm);
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Reset the form whenever the dialog opens or closes — render-phase reset per
  // the React "adjusting state on prop change" pattern (matches NewItemDialog).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    setForm(emptyForm());
    setFieldErrors({});
    setPending(false);
  }

  const nameEmpty = form.name.trim().length === 0;
  const submitDisabled = pending || nameEmpty;

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitDisabled) return;

    setPending(true);
    setFieldErrors({});

    const { ok, status, data } = await postJson<{
      error?: string;
      details?: Record<string, string[]>;
    }>("/api/collections", {
      name: form.name,
      description: form.description,
    });

    setPending(false);

    if (!ok) {
      if (data?.details) setFieldErrors(data.details);
      toast.error(
        status === 0
          ? "Network error. Please try again."
          : (data?.error ?? "Could not create collection."),
      );
      return;
    }

    toast.success("Collection created");
    setForm(emptyForm());
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
          <DialogTitle>New collection</DialogTitle>
          <DialogDescription>
            Group related items — snippets, prompts, links and more — under one
            name.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5 overflow-y-auto p-6"
        >
          <Field label="Name" error={fieldErrors.name}>
            <Input
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
              aria-invalid={nameEmpty || Boolean(fieldErrors.name)}
              autoFocus
            />
          </Field>

          <Field label="Description" error={fieldErrors.description}>
            <textarea
              value={form.description}
              onChange={(event) => set("description", event.target.value)}
              rows={3}
              className={textareaClass}
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
              {pending ? "Creating…" : "Create collection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
