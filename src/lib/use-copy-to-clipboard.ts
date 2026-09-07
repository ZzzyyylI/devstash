import { useEffect, useRef, useState } from "react";

/**
 * `copy(text)` writes `text` to the clipboard and flips `copied` to `true` for
 * `resetMs` (default 1.5s). No-ops — leaving `copied` `false` — when
 * `navigator.clipboard` is missing or the write is blocked. The reset timer is
 * cleared on unmount.
 *
 * Shared by the code editor, the markdown editor, and the card copy button,
 * which each render their own chrome around it.
 */
export function useCopyToClipboard(resetMs = 1500): {
  copied: boolean;
  copy: (text: string) => void;
} {
  const [copied, setCopied] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, []);

  function copy(text: string) {
    const done = navigator.clipboard?.writeText(text);
    if (!done) return;
    done
      .then(() => {
        setCopied(true);
        if (timeout.current) clearTimeout(timeout.current);
        timeout.current = setTimeout(() => setCopied(false), resetMs);
      })
      .catch(() => {
        /* clipboard blocked — nothing to do */
      });
  }

  return { copied, copy };
}
