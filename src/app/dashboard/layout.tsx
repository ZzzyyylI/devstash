import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getItemTypesWithCounts } from "@/lib/db/item-types";
import { getSidebarCollections } from "@/lib/db/collections";
import { getSearchIndex } from "@/lib/db/search";

// The sidebar reads live data from Neon — don't statically cache it at build time.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, itemTypes, collections, searchIndex] = await Promise.all([
    auth(),
    getItemTypesWithCounts(),
    getSidebarCollections(),
    getSearchIndex(),
  ]);

  const user = {
    name: session?.user?.name,
    email: session?.user?.email,
    image: session?.user?.image,
  };

  return (
    <DashboardShell
      itemTypes={itemTypes}
      collections={collections}
      user={user}
      searchIndex={searchIndex}
    >
      {children}
    </DashboardShell>
  );
}
