import { getCollectionsPage } from "@/lib/db/collections";
import { parsePageParam } from "@/lib/pagination";
import { CollectionCard } from "@/components/dashboard/CollectionCard";
import { Pagination } from "@/components/ui/pagination";

// Reads live data from Neon — don't statically cache it at build time.
export const dynamic = "force-dynamic";

/** The demo user's collections, paginated, as a grid of cards linking to each detail page. */
export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { page: pageParam } = await searchParams;
  const {
    items: collections,
    page,
    pageCount,
    total,
  } = await getCollectionsPage(parsePageParam(pageParam));

  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold">Collections</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} {total === 1 ? "collection" : "collections"}
        </p>
      </div>

      {total === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">
          No collections yet.
        </p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} />
            ))}
          </div>
          <Pagination page={page} pageCount={pageCount} basePath="/collections" />
        </>
      )}
    </div>
  );
}
