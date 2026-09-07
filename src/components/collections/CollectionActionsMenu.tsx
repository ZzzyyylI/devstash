"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil, Star, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EditCollectionDialog,
  type EditableCollection,
} from "@/components/collections/EditCollectionDialog";
import { DeleteCollectionDialog } from "@/components/collections/DeleteCollectionDialog";
import { useCollectionFavorite } from "@/components/collections/use-collection-favorite";

interface CollectionActionsMenuProps {
  collection: EditableCollection;
  /** Extra classes for the trigger button (positioning lives on the card). */
  className?: string;
}

/**
 * The three-dots menu on a `CollectionCard` — Edit / Favorite / Delete. Sits as
 * a `pointer-events-auto` sibling of the card's stretched `<Link>` overlay, so
 * opening the menu doesn't navigate. Delete just refreshes the route (the card
 * disappears from the server-rendered list); the detail page has its own
 * navigation. Favorite toggles `isFavorite` via a shared hook, then refreshes.
 */
export function CollectionActionsMenu({
  collection,
  className,
}: CollectionActionsMenuProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const favorite = useCollectionFavorite(collection);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${collection.name}`}
          className={cn(
            "pointer-events-auto inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-expanded:bg-muted aria-expanded:text-foreground",
            className,
          )}
        >
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              void favorite.toggle();
            }}
          >
            <Star
              className={cn(
                favorite.isFavorite && "fill-amber-400 text-amber-400",
              )}
            />
            {favorite.isFavorite ? "Unfavorite" : "Favorite"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={() => setDeleteOpen(true)}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
          router.refresh();
        }}
      />
    </>
  );
}
