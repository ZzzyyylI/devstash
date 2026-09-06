"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";

/** The editor grows with its content between these bounds; past the max it scrolls. */
const MIN_HEIGHT = 240;
const MAX_HEIGHT = 400;

type Tab = "write" | "preview";

/** SSR-safe layout effect (avoids the useLayoutEffect-on-server warning). */
const useIsoLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

interface MarkdownEditorProps {
  value: string;
  /** Omit (or pass `readOnly`) for a display-only preview. */
  onChange?: (value: string) => void;
  readOnly?: boolean;
  autoFocus?: boolean;
  className?: string;
}

/**
 * Markdown view/editor for note & prompt content. A dark header carries the
 * Write / Preview tabs and a copy button (same style as {@link CodeEditor});
 * the body grows with its content up to {@link MAX_HEIGHT}px, then scrolls.
 * In readonly mode only the Preview tab shows; in edit mode it defaults to
 * Write with Preview a click away.
 */
export function MarkdownEditor({
  value,
  onChange,
  readOnly = false,
  autoFocus = false,
  className,
}: MarkdownEditorProps) {
  const isReadOnly = readOnly || !onChange;
  const [tab, setTab] = useState<Tab>(isReadOnly ? "preview" : "write");
  const [copied, setCopied] = useState(false);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Grow the textarea to fit its content, clamped to [MIN, MAX].
  useIsoLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el || tab !== "write") return;
    el.style.height = "auto";
    el.style.height = `${Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, el.scrollHeight))}px`;
  }, [value, tab]);

  useEffect(() => {
    if (autoFocus && !isReadOnly && tab === "write") {
      textareaRef.current?.focus();
    }
  }, [autoFocus, isReadOnly, tab]);

  useEffect(() => {
    return () => {
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
    };
  }, []);

  function handleCopy() {
    if (!navigator.clipboard) return;
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
      copyTimeout.current = setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-[#333] bg-[#1e1e1e]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[#333] bg-[#2d2d2d] px-2 py-1.5">
        <div className="flex items-center gap-1">
          {!isReadOnly && (
            <TabButton
              active={tab === "write"}
              onClick={() => setTab("write")}
            >
              Write
            </TabButton>
          )}
          <TabButton
            active={tab === "preview"}
            onClick={() => setTab("preview")}
          >
            Preview
          </TabButton>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-white/50 transition-colors hover:bg-white/10 hover:text-white/80"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {tab === "write" && !isReadOnly ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          spellCheck={false}
          placeholder="Write Markdown…"
          className="markdown-write block w-full resize-none border-0 bg-[#1e1e1e] px-4 py-3 font-mono text-[13px] leading-relaxed text-white/85 outline-none placeholder:text-white/25"
          style={{ minHeight: MIN_HEIGHT, maxHeight: MAX_HEIGHT }}
        />
      ) : (
        <div
          className="markdown-preview overflow-y-auto px-4 py-3"
          style={{ minHeight: MIN_HEIGHT, maxHeight: MAX_HEIGHT }}
        >
          {value.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <p className="text-white/25">Nothing to preview.</p>
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "cursor-pointer rounded px-2 py-1 text-[11px] font-medium transition-colors",
        active
          ? "bg-white/10 text-white/90"
          : "text-white/45 hover:bg-white/5 hover:text-white/70",
      )}
    >
      {children}
    </button>
  );
}
