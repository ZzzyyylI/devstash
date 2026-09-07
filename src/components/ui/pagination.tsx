import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ELLIPSIS, pageWindow } from "@/lib/pagination";

interface PaginationProps {
  /** Current 1-based page. */
  page: number;
  /** Total number of pages. */
  pageCount: number;
  /**
   * Path without a query string, e.g. `/collections` or `/items/snippet`. Page
   * links are `${basePath}?page=N`, except page 1 which links to `basePath`.
   */
  basePath: string;
  className?: string;
}

/**
 * Numbered pager for the list views. Renders nothing for a single page. Prev /
 * next render as disabled buttons (not links) at the ends; the current page is
 * a filled button, the rest are outline links. Server component — the page
 * lives entirely in the `?page=` query param.
 */
export function Pagination({
  page,
  pageCount,
  basePath,
  className,
}: PaginationProps) {
  if (pageCount <= 1) return null;

  const href = (p: number) => (p <= 1 ? basePath : `${basePath}?page=${p}`);
  const pages = pageWindow(page, pageCount);

  return (
    <nav
      aria-label="Pagination"
      className={cn("mt-8 flex items-center justify-center gap-1", className)}
    >
      {page > 1 ? (
        <Button asChild variant="outline" size="icon-lg" aria-label="Previous page">
          <Link href={href(page - 1)} rel="prev">
            <ChevronLeft />
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="icon-lg" disabled aria-label="Previous page">
          <ChevronLeft />
        </Button>
      )}

      {pages.map((entry, i) =>
        entry === ELLIPSIS ? (
          <span
            key={`gap-${i}`}
            aria-hidden
            className="flex size-9 items-center justify-center text-sm text-muted-foreground"
          >
            …
          </span>
        ) : entry === page ? (
          <Button
            key={entry}
            variant="default"
            size="icon-lg"
            aria-current="page"
            aria-label={`Page ${entry}`}
          >
            {entry}
          </Button>
        ) : (
          <Button
            key={entry}
            asChild
            variant="outline"
            size="icon-lg"
            aria-label={`Page ${entry}`}
          >
            <Link href={href(entry)}>{entry}</Link>
          </Button>
        ),
      )}

      {page < pageCount ? (
        <Button asChild variant="outline" size="icon-lg" aria-label="Next page">
          <Link href={href(page + 1)} rel="next">
            <ChevronRight />
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="icon-lg" disabled aria-label="Next page">
          <ChevronRight />
        </Button>
      )}
    </nav>
  );
}
