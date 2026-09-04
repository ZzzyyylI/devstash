import type { LucideIcon } from "lucide-react";

import type { MockItem } from "@/lib/mock-data";
import { ItemRow } from "@/components/dashboard/ItemRow";

interface ItemsSectionProps {
  title: string;
  icon: LucideIcon;
  items: MockItem[];
}

/** A titled list of item rows (used for both Pinned and Recent). */
export function ItemsSection({ title, icon: Icon, items }: ItemsSectionProps) {
  if (items.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
