import {
  Download,
  File,
  FileCode,
  FileSpreadsheet,
  FileText,
  Pin,
  Star,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import type { ItemWithType } from "@/lib/db/items";
import { extensionOf, formatBytes } from "@/lib/file-constraints";

/** Format a date as e.g. "Jan 15, 2026". */
function formatUploadDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const EXTENSION_ICON: Record<string, IconComponent> = {
  ".pdf": FileText,
  ".txt": FileText,
  ".md": FileText,
  ".json": FileCode,
  ".xml": FileCode,
  ".yaml": FileCode,
  ".yml": FileCode,
  ".toml": FileCode,
  ".ini": FileCode,
  ".csv": FileSpreadsheet,
};

/**
 * A single row in the `file` type page's Drive/Dropbox-style list: extension
 * icon, file name, size, upload date, and a download link.
 *
 * Layout is a "stretched link" card: an absolutely-positioned button fills the
 * row and opens the item drawer, while the visible content sits on top with
 * `pointer-events-none` so clicks fall through to it. The download `<a>` opts
 * back in with `pointer-events-auto` and is a *sibling* of the trigger (not
 * nested), so a plain same-origin `<a download>` handles the download with no
 * event-propagation juggling. On mobile the size/date/download meta stacks
 * under the name.
 */
export function FileRow({
  item,
  onOpen,
}: {
  item: ItemWithType;
  onOpen: () => void;
}) {
  const Icon = EXTENSION_ICON[extensionOf(item.fileName ?? "")] ?? File;
  const name = item.fileName ?? item.title;
  const showTitle = item.title !== name;

  return (
    <div className="group relative flex cursor-pointer flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:gap-4">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${name}`}
        className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      <div className="pointer-events-none relative flex min-w-0 flex-1 items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{name}</p>
            {item.isPinned && (
              <Pin className="size-3.5 shrink-0 text-muted-foreground" />
            )}
            {item.isFavorite && (
              <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
            )}
          </div>
          {showTitle && (
            <p className="truncate text-xs text-muted-foreground">{item.title}</p>
          )}
        </div>
      </div>

      <div className="pointer-events-none relative flex items-center gap-4 pl-12 text-xs text-muted-foreground sm:pl-0">
        <span className="tabular-nums">{formatBytes(item.fileSize)}</span>
        <span className="whitespace-nowrap">
          {formatUploadDate(item.createdAt)}
        </span>
        <a
          href={`/api/files/${item.id}?download=1`}
          download
          aria-label={`Download ${name}`}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 font-medium transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Download className="size-4" />
          <span className="hidden sm:inline">Download</span>
        </a>
      </div>
    </div>
  );
}
