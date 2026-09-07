import { cn } from "@/lib/utils";
import { itemType, type Feature } from "@/lib/home-content";

/** One entry from `FEATURES`, with an accent colour from its item type. */
export function FeatureCard({ feature }: { feature: Feature }) {
  const type = itemType(feature.typeName);
  const Icon = feature.icon;

  return (
    <article
      className={cn(
        "h-full rounded-xl border border-border border-t-[3px] bg-card/60 p-6 transition-transform duration-200 hover:-translate-y-1",
        type.topBorder,
      )}
    >
      <div
        className={cn(
          "mb-4 flex size-11 items-center justify-center rounded-xl",
          type.iconBg,
          type.icon,
        )}
      >
        <Icon className="size-6" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight">{feature.title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{feature.blurb}</p>
    </article>
  );
}
