"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";
import { debounce, type Debounced } from "@/lib/debounce";

/** The editor grows with its content between these bounds; past the max it scrolls. */
const MIN_HEIGHT = 240;
const MAX_HEIGHT = 400;

/** How long typing has to pause before the edit is pushed up to the parent form. */
const ONCHANGE_DEBOUNCE_MS = 250;

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

  // The textarea is driven by local `draft` for instant feedback; the value is
  // pushed up to the parent form (which re-renders the whole edit tree) only
  // after typing pauses. `lastEmitted` lets us ignore the parent echoing our
  // own change back as a new `value` prop.
  const [draft, setDraft] = useState(value);
  const lastEmitted = useRef(value);
  const prevValue = useRef(value);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Created once; stable for the component's lifetime. The callback touches the
  // refs only when it fires (from a timer), never during render — so the
  // `react-hooks/refs` warning here is a false positive.
  // eslint-disable-next-line react-hooks/refs
  const [emit] = useState<Debounced<[string]>>(() =>
    debounce((next: string) => {
      lastEmitted.current = next;
      onChangeRef.current?.(next);
    }, ONCHANGE_DEBOUNCE_MS),
  );

  // Resync the draft when the parent value changes to something we didn't just
  // emit (form reset, an external edit) — our own echoes are ignored.
  useEffect(() => {
    if (value === prevValue.current) return;
    prevValue.current = value;
    if (value !== lastEmitted.current) {
      emit.cancel();
      lastEmitted.current = value;
      setDraft(value);
    }
  }, [value, emit]);

  // Flush any pending edit when the editor goes away.
  useEffect(() => () => emit.flush(), [emit]);

  function handleDraftChange(next: string) {
    setDraft(next);
    emit(next);
  }

  function selectTab(next: Tab) {
    // Make sure the parent has the latest text before Preview renders from it.
    if (next === "preview") emit.flush();
    setTab(next);
  }

  // Grow the textarea to fit its content, clamped to [MIN, MAX].
  useIsoLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el || tab !== "write") return;
    el.style.height = "auto";
    el.style.height = `${Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, el.scrollHeight))}px`;
  }, [draft, tab]);

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
    void navigator.clipboard.writeText(draft).then(() => {
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
              onClick={() => selectTab("write")}
            >
              Write
            </TabButton>
          )}
          <TabButton
            active={tab === "preview"}
            onClick={() => selectTab("preview")}
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
          value={draft}
          onChange={(event) => handleDraftChange(event.target.value)}
          onBlur={() => emit.flush()}
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
          {draft.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft}</ReactMarkdown>
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
