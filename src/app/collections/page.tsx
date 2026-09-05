import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getCollectionCount } from "@/lib/db/collections";

// Reads live data from Neon — don't statically cache it at build time.
export const dynamic = "force-dynamic";

/**
 * Placeholder target for the sidebar's "View all collections" link. The full
 * collections list view is built in a later phase.
 */
export default async function CollectionsPage() {
  const count = await getCollectionCount();

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Collections</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {count} {count === 1 ? "collection" : "collections"}. The full
        collections list is coming in a later phase.
      </p>
    </div>
  );
}
