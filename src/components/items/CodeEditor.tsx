"use client";

import { useCallback, useState } from "react";
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";
import { useCopyToClipboard } from "@/lib/use-copy-to-clipboard";
import { toMonacoLanguage } from "@/lib/code-editor";

/** Editor grows with its content between these bounds; past the max it scrolls. */
const MIN_HEIGHT = 96;
const MAX_HEIGHT = 400;
const LINE_HEIGHT = 20;
const VERTICAL_PADDING = 24;

function clampHeight(height: number): number {
  return Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.ceil(height)));
}

function estimateHeight(value: string): number {
  const lines = value ? value.split("\n").length : 1;
  return clampHeight(lines * LINE_HEIGHT + VERTICAL_PADDING);
}

/** vs-dark tuned to the app's surfaces, with a subtle theme-matched scrollbar. */
function defineTheme(monaco: Monaco) {
  monaco.editor.defineTheme("devstash-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#1e1e1e",
      "editorGutter.background": "#1e1e1e",
      "editorLineNumber.foreground": "#ffffff40",
      "editorLineNumber.activeForeground": "#ffffff99",
      "scrollbarSlider.background": "#ffffff1f",
      "scrollbarSlider.hoverBackground": "#ffffff33",
      "scrollbarSlider.activeBackground": "#ffffff4d",
      "editorOverviewRuler.border": "#00000000",
    },
  });
}

interface CodeEditorProps {
  value: string;
  /** Omit (or pass `readOnly`) for a display-only editor. */
  onChange?: (value: string) => void;
  language?: string | null;
  readOnly?: boolean;
  autoFocus?: boolean;
  className?: string;
}

/**
 * Monaco-backed code view/editor for snippet & command content. macOS-style
 * window dots plus a language label and copy button sit in the header; the body
 * grows with its content up to {@link MAX_HEIGHT}px, then scrolls.
 */
export function CodeEditor({
  value,
  onChange,
  language,
  readOnly = false,
  autoFocus = false,
  className,
}: CodeEditorProps) {
  const isReadOnly = readOnly || !onChange;
  const [height, setHeight] = useState(() => estimateHeight(value));
  const { copied, copy } = useCopyToClipboard();

  const handleBeforeMount = useCallback((monaco: Monaco) => {
    defineTheme(monaco);
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

  const label = (language ?? "").trim();

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-[#333] bg-[#1e1e1e]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[#333] bg-[#252526] px-3 py-2">
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="size-3 rounded-full bg-[#ff5f56]" />
          <span className="size-3 rounded-full bg-[#ffbd2e]" />
          <span className="size-3 rounded-full bg-[#27c93f]" />
        </div>
        <div className="flex items-center gap-2">
          {label && (
            <span className="text-[11px] font-medium uppercase tracking-wide text-white/40">
              {label}
            </span>
          )}
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

      <Editor
        height={height}
        language={toMonacoLanguage(language)}
        value={value}
        theme="devstash-dark"
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
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 13,
          lineHeight: LINE_HEIGHT,
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
          tabSize: 2,
          wordWrap: "off",
          smoothScrolling: true,
          automaticLayout: true,
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
            useShadows: false,
            alwaysConsumeMouseWheel: false,
          },
        }}
      />
    </div>
  );
}
