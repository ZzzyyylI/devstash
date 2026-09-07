"use client";

import { useState } from "react";
import { toast } from "sonner";

import { postJson } from "@/lib/post-json";
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

interface DeleteCollectionDialogProps {
  collection: { id: string; name: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after the collection is deleted — the caller decides where to go. */
  onDeleted?: () => void;
}

/**
 * Confirmation dialog for deleting a collection. Sends
 * `DELETE /api/collections/[id]`. The collection's items are **not** deleted —
 * they just stop belonging to it. On success (or a 404 — already gone) it toasts
 * and calls `onDeleted`; the parent decides what happens next (the detail page
 * navigates to `/collections`, the card menu closes the dialog + refreshes).
 */
export function DeleteCollectionDialog({
  collection,
  open,
  onOpenChange,
  onDeleted,
}: DeleteCollectionDialogProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (deleting) return;

    setDeleting(true);
    const { ok, status, data } = await postJson<{ error?: string }>(
      `/api/collections/${collection.id}`,
      undefined,
      "DELETE",
    );
    setDeleting(false);

    // A 404 means it's already gone (e.g. a stale tab) — still treat that as
    // done so the caller navigates away instead of leaving the user stuck.
    if (!ok && status !== 404) {
      toast.error(
        status === 0
          ? "Network error. Please try again."
          : (data?.error ?? "Could not delete collection."),
      );
      return;
    }

    toast.success("Collection deleted");
    // The parent owns what happens next (navigate away, or close + refresh) —
    // don't also flip `open` here, so there's no close-vs-navigate race.
    onDeleted?.();
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!deleting) onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this collection?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{collection.name}&rdquo; will be deleted. Its items won&apos;t
            be deleted — they&apos;ll just no longer belong to this collection.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
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
  );
}
