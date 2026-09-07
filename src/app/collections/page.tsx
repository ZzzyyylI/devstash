import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getSidebarCollections } from "@/lib/db/collections";
import { CollectionCard } from "@/components/dashboard/CollectionCard";

// Reads live data from Neon — don't statically cache it at build time.
export const dynamic = "force-dynamic";

/** All of the demo user's collections as a grid of cards linking to each detail page. */
export default async function CollectionsPage() {
  const collections = await getSidebarCollections();

  return (
    <div className="mx-auto max-w-6xl p-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to dashboard
      </Link>
      <div className="mt-4">
        <h1 className="text-2xl font-semibold">Collections</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {collections.length}{" "}
          {collections.length === 1 ? "collection" : "collections"}
        </p>
      </div>

      {collections.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">
          No collections yet.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      )}
    </div>
  );
}
