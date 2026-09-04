import type { Metadata } from "next";
import { Clock, Pin } from "lucide-react";

import { mockItems } from "@/lib/mock-data";
import { StatsSection } from "@/components/dashboard/StatsSection";
import { CollectionsSection } from "@/components/dashboard/CollectionsSection";
import { ItemsSection } from "@/components/dashboard/ItemsSection";

export const metadata: Metadata = {
  title: "Dashboard | DevStash",
};

// CollectionsSection reads live data from Neon — don't statically cache this
// page at build time.
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const pinnedItems = mockItems.filter((item) => item.isPinned);
  const recentItems = [...mockItems]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 10);

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
