import { Folder, Heart, Layers, Star } from "lucide-react";

import { mockCollections, mockItems, mockItemTypes } from "@/lib/mock-data";
import { StatCard } from "@/components/dashboard/StatCard";

/**
 * Four at-a-glance metrics. Counts are derived from the mock data aggregates
 * (type item counts for totals, favourite flags for the rest).
 */
export function StatsSection() {
  const totalItems = mockItemTypes.reduce((sum, type) => sum + type.itemCount, 0);
  const favoriteItems = mockItems.filter((item) => item.isFavorite).length;
  const favoriteCollections = mockCollections.filter((c) => c.isFavorite).length;

  const stats = [
    {
      icon: Layers,
      label: "Total items",
      value: totalItems,
      iconClassName: "bg-blue-500/10 text-blue-500",
    },
    {
      icon: Folder,
      label: "Collections",
      value: mockCollections.length,
      iconClassName: "bg-purple-500/10 text-purple-500",
    },
    {
      icon: Star,
      label: "Favorite items",
      value: favoriteItems,
      iconClassName: "bg-amber-500/10 text-amber-500",
    },
    {
      icon: Heart,
      label: "Favorite collections",
      value: favoriteCollections,
      iconClassName: "bg-teal-500/10 text-teal-500",
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </section>
  );
}
