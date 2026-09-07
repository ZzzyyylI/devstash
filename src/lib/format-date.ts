/**
 * Shared date formatting. All fixed to `en-US` so the output is stable
 * regardless of the runtime locale (matches how these were written inline).
 */

/** e.g. "Jan 15" — card / row timestamps. */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** e.g. "Jan 15, 2026" — file upload dates. */
export function formatMediumDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** e.g. "January 15, 2024" — detail views. Accepts a `Date` or an ISO string. */
export function formatLongDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
