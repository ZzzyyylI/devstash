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

export interface EditableCollection {
  id: string;
  name: string;
  description: string | null;
  isFavorite: boolean;
}

interface EditCollectionDialogProps {
  collection: EditableCollection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the updated row after a successful save. */
  onSaved?: (updated: EditableCollection) => void;
}

/**
 * "Edit collection" modal — edits a collection's metadata (name + description).
 * Pre-fills from `collection` and re-seeds whenever the dialog opens (render-phase
 * reset, matching `NewCollectionDialog`). Posts `PATCH /api/collections/[id]`,
 * which re-validates everything; on success it toasts, closes, and refreshes the
 * route so the server-rendered header / cards / sidebar pick up the change.
 */
export function EditCollectionDialog({
  collection,
  open,
  onOpenChange,
  onSaved,
}: EditCollectionDialogProps) {
  const router = useRouter();

  const [form, setForm] = useState({
    name: collection.name,
    description: collection.description ?? "",
  });
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Re-seed the form from props whenever the dialog opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm({
        name: collection.name,
        description: collection.description ?? "",
      });
    }
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
      data?: EditableCollection;
    }>(
      `/api/collections/${collection.id}`,
      { name: form.name, description: form.description },
      "PATCH",
    );

    setPending(false);

    if (!ok) {
      if (data?.details) setFieldErrors(data.details);
      toast.error(
        status === 0
          ? "Network error. Please try again."
          : (data?.error ?? "Could not update collection."),
      );
      return;
    }

    toast.success("Collection updated");
    onOpenChange(false);
    if (data?.data) onSaved?.(data.data);
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
          <DialogTitle>Edit collection</DialogTitle>
          <DialogDescription>
            Update this collection&apos;s name and description. Its items
            aren&apos;t affected.
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
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
