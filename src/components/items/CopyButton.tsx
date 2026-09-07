"use client";

import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";
import { useCopyToClipboard } from "@/lib/use-copy-to-clipboard";

/**
 * A small icon button that copies `text` to the clipboard and briefly swaps to a
 * check mark (1.5s), mirroring the Copy control in `CodeEditor` / the item drawer.
 * Rendered on top of a card's stretched-link trigger, so it stops propagation to
 * keep a copy click from also opening the drawer.
 */
export function CopyButton({
  text,
  label = "Copy to clipboard",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const { copied, copy } = useCopyToClipboard();

  function handleCopy(event: React.MouseEvent) {
    event.stopPropagation();
    copy(text);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label}
      title={copied ? "Copied" : "Copy"}
      className={cn(
        "inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {copied ? (
        <Check className="size-3.5 text-emerald-500" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </button>
  );
}
