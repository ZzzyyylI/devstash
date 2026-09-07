/**
 * Shared pagination constants + helpers for the list views (`/items/[type]`,
 * `/collections`, `/collections/[id]`) and the dashboard's capped sections.
 *
 * The list pages read the current page from a `?page=` query param, fetch only
 * that page's rows (`skip` / `take`) plus a total count, and render numbered
 * page links. Nothing here loads a whole dataset to slice it in memory.
 */

/** Rows per page on `/items/[type]` and `/collections/[id]`. */
export const ITEMS_PER_PAGE = 21;

/** Cards per page on the `/collections` list. */
export const COLLECTIONS_PER_PAGE = 21;

/** Collections shown in the dashboard's "Collections" section. */
export const DASHBOARD_COLLECTIONS_LIMIT = 6;

/** Items shown in the dashboard's "Recent" section. */
export const DASHBOARD_RECENT_ITEMS_LIMIT = 10;

/** One page of results plus the metadata the pager needs. */
export interface Paginated<T> {
  items: T[];
  /** 1-based, clamped to `[1, pageCount]`. */
  page: number;
  /** Total number of pages, always at least 1. */
  pageCount: number;
  /** Total matching rows across all pages. */
  total: number;
}

/**
 * Parse a raw `?page=` value (Next's `searchParams` gives `string | string[] |
 * undefined`) into a 1-based page number. Anything that isn't a positive
 * integer — missing, `0`, `-3`, `"abc"`, `"2.5"` — falls back to page 1.
 */
export function parsePageParam(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

export interface PageSlice {
  /** The requested page clamped into range. */
  page: number;
  pageCount: number;
  total: number;
  skip: number;
  take: number;
}

/**
 * Turn a total row count + a requested page into a clamped page number and the
 * `skip` / `take` for a Prisma query. An out-of-range request (past the last
 * page, or below 1) is clamped rather than returning an empty page.
 */
export function paginate(
  total: number,
  requestedPage: number,
  pageSize: number,
): PageSlice {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, Math.trunc(requestedPage) || 1), pageCount);
  return { page, pageCount, total, skip: (page - 1) * pageSize, take: pageSize };
}

/** Marker for a gap between page numbers in {@link pageWindow}. */
export const ELLIPSIS = "ellipsis" as const;

/**
 * The page numbers to show in the pager: all of them when there are 7 or fewer,
 * otherwise the first page, the last page, the current page ± 1, and an
 * {@link ELLIPSIS} marker wherever the sequence skips.
 *
 * e.g. `pageWindow(5, 10)` → `[1, ELLIPSIS, 4, 5, 6, ELLIPSIS, 10]`.
 */
export function pageWindow(
  page: number,
  pageCount: number,
): (number | typeof ELLIPSIS)[] {
  if (pageCount <= 7) {
    return Array.from({ length: Math.max(1, pageCount) }, (_, i) => i + 1);
  }

  const result: (number | typeof ELLIPSIS)[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);

  if (start > 2) result.push(ELLIPSIS);
  for (let p = start; p <= end; p += 1) result.push(p);
  if (end < pageCount - 1) result.push(ELLIPSIS);

  result.push(pageCount);
  return result;
}
