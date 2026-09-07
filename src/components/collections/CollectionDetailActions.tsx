"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Star, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  EditCollectionDialog,
  type EditableCollection,
} from "@/components/collections/EditCollectionDialog";
import { DeleteCollectionDialog } from "@/components/collections/DeleteCollectionDialog";
import { useCollectionFavorite } from "@/components/collections/use-collection-favorite";

const iconButton =
  "inline-flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

/**
 * Favorite / Edit / Delete icon buttons in the `/collections/[id]` header.
 * Favorite toggles `isFavorite` via a shared hook, then refreshes the route.
 * Deleting sends the user back to `/collections` (the collection no longer
 * exists); the items are untouched.
 */
export function CollectionDetailActions({
  collection,
}: {
  collection: EditableCollection;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const favorite = useCollectionFavorite(collection);

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label={
          favorite.isFavorite ? "Unfavorite collection" : "Favorite collection"
        }
        aria-pressed={favorite.isFavorite}
        disabled={favorite.pending}
        onClick={() => {
          void favorite.toggle();
        }}
        className={cn(
          iconButton,
          favorite.isFavorite && "text-amber-400 hover:text-amber-400",
        )}
      >
        <Star
          className={cn("size-4", favorite.isFavorite && "fill-amber-400")}
        />
      </button>
      <button
        type="button"
        aria-label="Edit collection"
        className={iconButton}
        onClick={() => setEditOpen(true)}
      >
        <Pencil className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Delete collection"
        className={cn(
          iconButton,
          "hover:bg-destructive/10 hover:text-destructive",
        )}
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className="size-4" />
      </button>

      <EditCollectionDialog
        collection={collection}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteCollectionDialog
        collection={collection}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => {
          setDeleteOpen(false);
          router.push("/collections");
        }}
      />
    </div>
  );
}
