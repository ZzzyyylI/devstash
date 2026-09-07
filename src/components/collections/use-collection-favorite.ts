"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { postJson } from "@/lib/post-json";

/**
 * Favorite-toggle behaviour shared by the collection card's three-dots menu
 * (`CollectionActionsMenu`) and the `/collections/[id]` header
 * (`CollectionDetailActions`). Sends `PATCH /api/collections/[id]/favorite`,
 * toasts, then `router.refresh()` so the server-rendered card / header star, the
 * sidebar Favorites group and `/favorites` all follow. The current flag comes
 * from the server-rendered `collection` prop (which updates on the refresh), so
 * there's no local optimistic state to keep in sync.
 */
export function useCollectionFavorite(collection: {
  id: string;
  isFavorite: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (pending) return;

    const next = !collection.isFavorite;
    setPending(true);
    const { ok, status, data } = await postJson<{ error?: string }>(
      `/api/collections/${collection.id}/favorite`,
      { isFavorite: next },
      "PATCH",
    );
    setPending(false);

    if (!ok) {
      toast.error(
        status === 0
          ? "Network error. Please try again."
          : (data?.error ?? "Could not update collection."),
      );
      return;
    }

    toast.success(next ? "Added to favorites" : "Removed from favorites");
    router.refresh();
  }

  return { pending, isFavorite: collection.isFavorite, toggle };
}
