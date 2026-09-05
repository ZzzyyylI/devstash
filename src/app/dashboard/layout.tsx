import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getItemTypesWithCounts } from "@/lib/db/items";
import { getSidebarCollections } from "@/lib/db/collections";

// The sidebar reads live data from Neon — don't statically cache it at build time.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, itemTypes, collections] = await Promise.all([
    auth(),
    getItemTypesWithCounts(),
    getSidebarCollections(),
  ]);

  const user = {
    name: session?.user?.name,
    email: session?.user?.email,
    image: session?.user?.image,
  };

  return (
    <DashboardShell itemTypes={itemTypes} collections={collections} user={user}>
      {children}
    </DashboardShell>
  );
}
