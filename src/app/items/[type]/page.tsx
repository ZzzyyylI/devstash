import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getItemTypesWithCounts } from "@/lib/db/items";

// Reads live data from Neon — don't statically cache it at build time.
export const dynamic = "force-dynamic";

/**
 * Placeholder target for the sidebar type links (e.g. /items/snippet). The
 * real item list view is built in a later phase.
 */
export default async function ItemsByTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  const itemTypes = await getItemTypesWithCounts();
  const itemType = itemTypes.find(
    (candidate) => candidate.name.toLowerCase() === type,
  );

  if (!itemType) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold capitalize">
        {itemType.name}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {itemType.itemCount} items in this type. The full item list is coming in a
        later phase.
      </p>
    </div>
  );
}
