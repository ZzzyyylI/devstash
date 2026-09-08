import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** A compact icon(+label) button for the item drawer's header action row. */
export function ActionButton({
  icon: Icon,
  label,
  ariaLabel,
  active = false,
  activeIconClass,
  destructive = false,
  disabled = false,
  onClick,
}: {
  icon: LucideIcon;
  label?: string;
  /** Accessible name when there's no visible `label` (icon-only button). */
  ariaLabel?: string;
  active?: boolean;
  activeIconClass?: string;
  destructive?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label ? undefined : ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium transition-colors",
        destructive
          ? "text-destructive hover:bg-destructive/10"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        active && !destructive && "text-foreground",
        disabled && "pointer-events-none opacity-40",
      )}
    >
      <Icon className={cn("size-4", active && activeIconClass)} />
      {label && <span>{label}</span>}
    </button>
  );
}
