import { Folder, Layers } from "lucide-react";

import { cn } from "@/lib/utils";
import { StatCard } from "@/components/dashboard/StatCard";
import { TYPE_ICON, FALLBACK_ICON, palette } from "@/lib/type-presentation";
import type { ProfileStats as ProfileStatsData } from "@/lib/db/profile";

/** Usage stats for the profile page: totals plus a per-item-type breakdown. */
export function ProfileStats({ stats }: { stats: ProfileStatsData }) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-medium text-muted-foreground">Usage</h2>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={Layers}
          label="Total items"
          value={stats.totalItems}
          iconClassName="bg-blue-500/10 text-blue-500"
        />
        <StatCard
          icon={Folder}
          label="Collections"
          value={stats.totalCollections}
          iconClassName="bg-purple-500/10 text-purple-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {stats.typeBreakdown.map((type) => {
          const Icon = TYPE_ICON[type.id] ?? FALLBACK_ICON;
          return (
            <div
              key={type.id}
              className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5"
            >
              <Icon
                className={cn("size-4 shrink-0", palette(type.color).text)}
              />
              <span className="min-w-0 flex-1 truncate text-sm">
                {type.name}
              </span>
              <span className="text-sm font-medium tabular-nums">
                {type.count}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
