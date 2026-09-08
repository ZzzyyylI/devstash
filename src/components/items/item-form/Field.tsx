import { cn } from "@/lib/utils";

/**
 * Labelled form-field wrapper shared by the "New Item" dialog and the item
 * drawer's edit form: label (+ optional right-aligned hint or action control),
 * the control, and the first field error underneath.
 */
export function Field({
  label,
  hint,
  error,
  headerRight,
  children,
}: {
  label: string;
  hint?: string;
  error?: string[];
  /**
   * Right-aligned node in the label row — e.g. an inline action button tied to
   * this field. Takes precedence over `hint` when both are given.
   */
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={cn(
          "flex items-baseline justify-between gap-2",
          // Keep the row height stable when it holds an inline control.
          headerRight && "min-h-7 items-center",
        )}
      >
        <label className="text-sm font-medium">{label}</label>
        {headerRight ??
          (hint && <span className="text-xs text-muted-foreground">{hint}</span>)}
      </div>
      {children}
      {error && error.length > 0 && (
        <p className="text-xs text-destructive">{error[0]}</p>
      )}
    </div>
  );
}
