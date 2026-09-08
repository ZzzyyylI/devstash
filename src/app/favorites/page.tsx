import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";

import { auth } from "@/auth";
import { getFavoriteItems } from "@/lib/db/items";
import { getFavoriteCollections } from "@/lib/db/collections";
import { FavoritesList } from "@/components/favorites/FavoritesList";

// Reads live data from Neon — don't statically cache it at build time.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Favorites · DevStash",
};

/** All of the demo user's favorited items and collections, in a compact list. */
export default async function FavoritesPage() {
  const [session, items, collections] = await Promise.all([
    auth(),
    getFavoriteItems(),
    getFavoriteCollections(),
  ]);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to dashboard
      </Link>
      <div className="mt-4 flex items-center gap-2">
        <Star className="size-5 fill-amber-400 text-amber-400" />
        <h1 className="text-2xl font-semibold">Favorites</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {items.length} {items.length === 1 ? "item" : "items"},{" "}
        {collections.length}{" "}
        {collections.length === 1 ? "collection" : "collections"}
      </p>

      <FavoritesList
        items={items}
        collections={collections}
        isPro={Boolean(session?.user?.isPro)}
      />
    </div>
  );
}
