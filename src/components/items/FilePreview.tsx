import Image from "next/image";
import { Download, FileText } from "lucide-react";

import { formatBytes } from "@/lib/file-constraints";
import type { ItemDetailJson } from "@/components/items/item-detail-json";
import { Section } from "@/components/items/item-drawer/Section";

/**
 * Readonly preview for a `file` / `image` item in the drawer. Images render
 * inline from the `/api/files/[id]` proxy (contained in a 16:9 box); files show
 * name + size. Both get a Download button that hits the same proxy with
 * `?download=1` (attachment disposition).
 */
export function FilePreview({ detail }: { detail: ItemDetailJson }) {
  const isImage = detail.type.name.toLowerCase() === "image";
  const src = `/api/files/${detail.id}`;

  return (
    <Section title={isImage ? "Image" : "File"} icon={FileText}>
      {isImage ? (
        <a href={src} target="_blank" rel="noreferrer" className="block">
          <span className="relative block aspect-video max-h-80 w-full overflow-hidden rounded-lg border border-border bg-muted">
            <Image
              src={src}
              alt={detail.fileName ?? detail.title}
              fill
              // Auth-gated same-origin proxy — Next's optimizer can't fetch it.
              unoptimized
              sizes="(min-width: 640px) 576px, 100vw"
              className="object-contain"
            />
          </span>
        </a>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-border p-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
            <FileText className="size-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {detail.fileName ?? detail.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(detail.fileSize)}
            </p>
          </div>
        </div>
      )}

      <a
        href={`${src}?download=1`}
        className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Download className="size-4" />
        Download{detail.fileSize ? ` (${formatBytes(detail.fileSize)})` : ""}
      </a>
    </Section>
  );
}
