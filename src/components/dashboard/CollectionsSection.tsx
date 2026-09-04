import { getRecentCollections } from "@/lib/db/collections";
import { CollectionCard } from "@/components/dashboard/CollectionCard";

/** Recent collections grid shown near the top of the dashboard. */
export async function CollectionsSection() {
  const collections = await getRecentCollections(6);

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Collections</h2>
        <span className="text-sm text-muted-foreground">View all</span>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {collections.map((collection) => (
          <CollectionCard key={collection.id} collection={collection} />
        ))}
      </div>
    </section>
  );
}
