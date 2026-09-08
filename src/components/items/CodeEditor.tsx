"use client";

import { useCallback, useState } from "react";
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import { Check, Copy, Crown, Loader2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { explainCode } from "@/actions/ai";
import { useCopyToClipboard } from "@/lib/use-copy-to-clipboard";
import { toMonacoLanguage } from "@/lib/code-editor";
import { monacoThemeName, toMonacoEditorOptions } from "@/lib/editor-preferences";
import { useEditorPreferencesValue } from "@/components/editor-preferences/EditorPreferencesProvider";
import { registerMonacoThemes } from "@/components/items/monaco-themes";

/** Editor grows with its content between these bounds; past the max it scrolls. */
const MIN_HEIGHT = 96;
const MAX_HEIGHT = 400;
const VERTICAL_PADDING = 24;

function clampHeight(height: number): number {
  return Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.ceil(height)));
}

function estimateHeight(value: string, lineHeight: number): number {
  const lines = value ? value.split("\n").length : 1;
  return clampHeight(lines * lineHeight + VERTICAL_PADDING);
}

/**
 * Enables the Pro "Explain" affordance + Code / Explain tabs in the header.
 * Only the item drawer's read-only view passes this — never the create/edit
 * forms.
 */
export interface CodeEditorExplain {
  /** Item title, sent to the model for context. */
  title: string;
  /** Item type name (`snippet` / `command`), sent to the model for context. */
  typeName: string;
  /** Gates the feature — free users see a Crown hint instead of a live button. */
  isPro: boolean;
}

interface CodeEditorProps {
  value: string;
  /** Omit (or pass `readOnly`) for a display-only editor. */
  onChange?: (value: string) => void;
  language?: string | null;
  readOnly?: boolean;
  autoFocus?: boolean;
  className?: string;
  explain?: CodeEditorExplain;
}

type Tab = "code" | "explain";

/**
 * Monaco-backed code view/editor for snippet & command content. macOS-style
 * window dots plus a language label and copy button sit in the header; the body
 * grows with its content up to {@link MAX_HEIGHT}px, then scrolls.
 *
 * Font size, tab size, word wrap, minimap and theme come from the user's editor
 * preferences (see `EditorPreferencesProvider`); they fall back to sensible
 * defaults when rendered outside a provider.
 *
 * When `explain` is passed (the item drawer's read view only), the header also
 * carries a Pro-gated "Explain" button; once it returns, the window dots are
 * replaced by Code / Explain tabs that toggle the body between the editor and
 * the rendered Markdown explanation. Explanations are never saved — each click
 * regenerates.
 */
export function CodeEditor({
  value,
  onChange,
  language,
  readOnly = false,
  autoFocus = false,
  className,
  explain,
}: CodeEditorProps) {
  const isReadOnly = readOnly || !onChange;
  const preferences = useEditorPreferencesValue();
  const preferenceOptions = toMonacoEditorOptions(preferences);
  const [height, setHeight] = useState(() =>
    estimateHeight(value, preferenceOptions.lineHeight),
  );
  const { copied, copy } = useCopyToClipboard();

  const [tab, setTab] = useState<Tab>("code");
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);

  const handleBeforeMount = useCallback((monaco: Monaco) => {
    registerMonacoThemes(monaco);
  }, []);

  const handleMount = useCallback<OnMount>(
    (editor) => {
      const applyHeight = () => setHeight(clampHeight(editor.getContentHeight()));
      editor.onDidContentSizeChange(applyHeight);
      applyHeight();
      if (autoFocus && !isReadOnly) editor.focus();
    },
    [autoFocus, isReadOnly],
  );

  async function handleExplain() {
    if (!explain || explaining) return;
    setExplaining(true);

    const result = await explainCode({
      title: explain.title,
      type: explain.typeName,
      content: value,
      language: language ?? null,
    });

    setExplaining(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    setExplanation(result.data.explanation);
    setTab("explain");
  }

  const label = (language ?? "").trim();
  const showExplain = Boolean(explain);
  const showExplanation = tab === "explain" && explanation !== null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-[#333] bg-[#1e1e1e]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[#333] bg-[#252526] px-3 py-2">
        {explanation !== null ? (
          <div className="flex items-center gap-1">
            <HeaderTab active={tab === "code"} onClick={() => setTab("code")}>
              Code
            </HeaderTab>
            <HeaderTab
              active={tab === "explain"}
              onClick={() => setTab("explain")}
            >
              Explain
            </HeaderTab>
          </div>
        ) : (
          <div className="flex items-center gap-1.5" aria-hidden>
            <span className="size-3 rounded-full bg-[#ff5f56]" />
            <span className="size-3 rounded-full bg-[#ffbd2e]" />
            <span className="size-3 rounded-full bg-[#27c93f]" />
          </div>
        )}
        <div className="flex items-center gap-2">
          {label && (
            <span className="text-[11px] font-medium uppercase tracking-wide text-white/40">
              {label}
            </span>
          )}
          {showExplain &&
            (explain!.isPro ? (
              <button
                type="button"
                onClick={handleExplain}
                disabled={explaining || value.trim().length === 0}
                className="inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-white/50 transition-colors hover:bg-white/10 hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-white/50"
              >
                {explaining ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Sparkles className="size-3" />
                )}
                {explaining
                  ? "Explaining…"
                  : explanation !== null
                    ? "Regenerate"
                    : "Explain"}
              </button>
            ) : (
              <span
                title="AI features require Pro subscription"
                className="inline-flex cursor-default items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-white/35"
              >
                <Crown className="size-3" />
                Explain
              </span>
            ))}
          <button
            type="button"
            onClick={() => copy(value)}
            className="inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-white/50 transition-colors hover:bg-white/10 hover:text-white/80"
          >
            {copied ? (
              <Check className="size-3" />
            ) : (
              <Copy className="size-3" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {showExplanation && (
        <div
          className="markdown-preview overflow-y-auto px-4 py-3"
          style={{ maxHeight: MAX_HEIGHT }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{explanation}</ReactMarkdown>
        </div>
      )}

      <div className={cn(showExplanation && "hidden")}>
        <Editor
          height={height}
          language={toMonacoLanguage(language)}
          value={value}
          theme={monacoThemeName(preferences.theme)}
          beforeMount={handleBeforeMount}
          onMount={handleMount}
          onChange={
            isReadOnly ? undefined : (next) => onChange?.(next ?? "")
          }
          loading={
            <pre className="max-h-[400px] overflow-auto p-4 text-xs leading-relaxed text-white/70">
              {value}
            </pre>
          }
          options={{
            readOnly: isReadOnly,
            domReadOnly: isReadOnly,
            scrollBeyondLastLine: false,
            fontFamily:
              "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
            padding: { top: 12, bottom: 12 },
            lineNumbersMinChars: 3,
            folding: !isReadOnly,
            renderLineHighlight: isReadOnly ? "none" : "line",
            overviewRulerLanes: 0,
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            contextmenu: !isReadOnly,
            smoothScrolling: true,
            automaticLayout: true,
            scrollbar: {
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
              useShadows: false,
              alwaysConsumeMouseWheel: false,
            },
            ...preferenceOptions,
          }}
        />
      </div>
    </div>
  );
}

function HeaderTab({
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
        "cursor-pointer rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
        active
          ? "bg-white/10 text-white/90"
          : "text-white/45 hover:bg-white/5 hover:text-white/70",
      )}
    >
      {children}
    </button>
  );
}
