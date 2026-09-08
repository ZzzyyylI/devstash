import { Folder, Heart, Layers, Star } from "lucide-react";

import { getItemStats } from "@/lib/db/items";
import { getCollectionStats } from "@/lib/db/collections";
import { StatCard } from "@/components/dashboard/StatCard";

/** Four at-a-glance metrics, sourced live from Neon via Prisma. */
export async function StatsSection() {
  const [itemStats, collectionStats] = await Promise.all([
    getItemStats(),
    getCollectionStats(),
  ]);

  const stats = [
    {
      icon: Layers,
      label: "Total items",
      value: itemStats.total,
      iconClassName: "bg-blue-500/10 text-blue-500",
    },
    {
      icon: Folder,
      label: "Collections",
      value: collectionStats.total,
      iconClassName: "bg-purple-500/10 text-purple-500",
    },
    {
      icon: Star,
      label: "Favorite items",
      value: itemStats.favorites,
      iconClassName: "bg-amber-500/10 text-amber-500",
    },
    {
      icon: Heart,
      label: "Favorite collections",
      value: collectionStats.favorites,
      iconClassName: "bg-teal-500/10 text-teal-500",
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </section>
  );
}
