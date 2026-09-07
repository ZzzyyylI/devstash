"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { ItemWithType } from "@/lib/db/items";
import type { ItemDetailJson } from "@/components/items/item-detail-json";

/**
 * Drawer state + detail-fetch machinery shared by anything that opens the item
 * drawer: the card lists (`ItemBrowser`) and the command palette. `select` takes
 * the card-level data we already have (shown immediately) and fetches full
 * detail from `/api/items/[id]`, caching it for re-opens. `handleSaved` /
 * `handleDeleted` reconcile that cache and re-run the server components.
 */
export function useItemDrawer() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<ItemWithType | null>(null);
  const [detail, setDetail] = useState<ItemDetailJson | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const cache = useRef(new Map<string, ItemDetailJson>());
  const requestId = useRef(0);

  function select(item: ItemWithType) {
    setSummary(item);
    setError(false);
    setOpen(true);

    const cached = cache.current.get(item.id);
    if (cached) {
      setDetail(cached);
      setLoading(false);
      return;
    }

    setDetail(null);
    setLoading(true);
    const id = ++requestId.current;

    fetch(`/api/items/${item.id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { data: ItemDetailJson };
        return body.data;
      })
      .then((data) => {
        cache.current.set(item.id, data);
        if (requestId.current === id) {
          setDetail(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (requestId.current === id) {
          setError(true);
          setLoading(false);
        }
      });
  }

  // After an edit saves, refresh the drawer's own state from the returned
  // detail and re-run the server components so any card list reflects the change.
  function handleSaved(updated: ItemDetailJson) {
    cache.current.set(updated.id, updated);
    setDetail(updated);
    setSummary((prev) =>
      prev && prev.id === updated.id
        ? {
            ...prev,
            title: updated.title,
            description: updated.description,
            content: updated.content,
            url: updated.url,
            isFavorite: updated.isFavorite,
            isPinned: updated.isPinned,
            type: updated.type,
            tags: updated.tags,
            updatedAt: new Date(updated.updatedAt),
          }
        : prev,
    );
    router.refresh();
  }

  // After a delete, close the drawer, drop the cached detail, and re-run the
  // server components so any card list loses the deleted item.
  function handleDeleted(id: string) {
    cache.current.delete(id);
    setOpen(false);
    router.refresh();
  }

  return {
    open,
    setOpen,
    summary,
    detail,
    loading,
    error,
    select,
    handleSaved,
    handleDeleted,
  };
}
