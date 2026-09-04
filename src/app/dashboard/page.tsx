import type { Metadata } from "next";
import { Clock, Pin } from "lucide-react";

import { getPinnedItems, getRecentItems } from "@/lib/db/items";
import { StatsSection } from "@/components/dashboard/StatsSection";
import { CollectionsSection } from "@/components/dashboard/CollectionsSection";
import { ItemsSection } from "@/components/dashboard/ItemsSection";

export const metadata: Metadata = {
  title: "Dashboard | DevStash",
};

// This page reads live data from Neon — don't statically cache it at build time.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [pinnedItems, recentItems] = await Promise.all([
    getPinnedItems(),
    getRecentItems(10),
  ]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your developer knowledge hub
        </p>
      </header>

      <StatsSection />
      <CollectionsSection />
      <ItemsSection title="Pinned" icon={Pin} items={pinnedItems} />
      <ItemsSection title="Recent" icon={Clock} items={recentItems} />
    </div>
  );
}
