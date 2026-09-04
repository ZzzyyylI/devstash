import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  /** bg + text colour classes for the icon chip */
  iconClassName: string;
}

/** Small metric card used in the dashboard stats row. Display only. */
export function StatCard({ icon: Icon, label, value, iconClassName }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            iconClassName,
          )}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl leading-none font-semibold">{value}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}
