import type { ItemDetail } from "@/lib/db/items";

/** `ItemDetail` as it arrives over the wire from `/api/items/[id]` — `Date`s serialised to strings. */
export type ItemDetailJson = Omit<ItemDetail, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};
