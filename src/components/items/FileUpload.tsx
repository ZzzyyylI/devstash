"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { File as FileIcon, UploadCloud, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  acceptAttr,
  formatBytes,
  validateUpload,
  type UploadKind,
} from "@/lib/file-constraints";
import { uploadFile, type UploadedFile } from "@/lib/upload-client";

export type { UploadedFile } from "@/lib/upload-client";

interface FileUploadProps {
  kind: UploadKind;
  value: UploadedFile | null;
  onChange: (value: UploadedFile | null) => void;
  disabled?: boolean;
}

type Phase =
  | { status: "idle" }
  | { status: "uploading"; progress: number }
  | { status: "error"; message: string }
  | { status: "done" };

/**
 * Drag-and-drop (or click) upload for `file` / `image` items. Validates the pick
 * client-side, then POSTs it to `/api/upload` with an `XMLHttpRequest` so the
 * progress bar reflects real bytes sent. On success it lifts `{ key, name, size }`
 * to the parent; the server action re-validates before anything is written.
 */
export function FileUpload({
  kind,
  value,
  onChange,
  disabled = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [phase, setPhase] = useState<Phase>(
    value ? { status: "done" } : { status: "idle" },
  );
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Revoke the object URL used for the instant image preview.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Abort an in-flight upload if the component unmounts (dialog closed).
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const upload = useCallback(
    (file: File) => {
      const check = validateUpload(kind, {
        name: file.name,
        size: file.size,
        type: file.type,
      });
      if (!check.ok) {
        setPhase({ status: "error", message: check.error });
        return;
      }

      if (kind === "image") {
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(file);
        });
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setPhase({ status: "uploading", progress: 0 });

      uploadFile(kind, file, {
        signal: controller.signal,
        onProgress: (progress) => setPhase({ status: "uploading", progress }),
      })
        .then((uploaded) => {
          abortRef.current = null;
          setPhase({ status: "done" });
          onChange(uploaded);
        })
        .catch((error: unknown) => {
          abortRef.current = null;
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
          setPhase({
            status: "error",
            message:
              error instanceof Error ? error.message : "Upload failed. Try again.",
          });
        });
    },
    [kind, onChange],
  );

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) upload(file);
  }

  function reset() {
    abortRef.current?.abort();
    abortRef.current = null;
    if (inputRef.current) inputRef.current.value = "";
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPhase({ status: "idle" });
    onChange(null);
  }

  const label = kind === "image" ? "image" : "file";

  // ── Completed / has a stored value ────────────────────────────────────────
  if (value && phase.status === "done") {
    return (
      <div className="rounded-lg border border-input p-3">
        <div className="flex items-start gap-3">
          {kind === "image" && previewUrl ? (
            <Image
              src={previewUrl}
              alt={value.name}
              width={64}
              height={64}
              // Local object URL — nothing for the optimizer to do.
              unoptimized
              className="size-16 shrink-0 rounded-md border border-border object-cover"
            />
          ) : (
            <div className="flex size-16 shrink-0 items-center justify-center rounded-md bg-muted">
              <FileIcon className="size-6 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{value.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(value.size)} · uploaded
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            disabled={disabled}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            aria-label={`Remove ${label}`}
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Uploading ────────────────────────────────────────────────────────────
  if (phase.status === "uploading") {
    return (
      <div className="rounded-lg border border-input p-4">
        <p className="text-sm font-medium">Uploading… {phase.progress}%</p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-150"
            style={{ width: `${phase.progress}%` }}
          />
        </div>
        <button
          type="button"
          onClick={reset}
          className="mt-3 text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Cancel
        </button>
      </div>
    );
  }

  // ── Idle / error — the drop zone ─────────────────────────────────────────
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        disabled={disabled}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors",
          "hover:border-ring hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-50",
          dragging ? "border-ring bg-muted/50" : "border-input",
          phase.status === "error" && "border-destructive",
        )}
      >
        <UploadCloud className="size-6 text-muted-foreground" />
        <span className="text-sm font-medium">
          Drop {kind === "image" ? "an image" : "a file"} here, or click to browse
        </span>
        <span className="text-xs text-muted-foreground">
          {acceptAttr(kind).replaceAll(",", " ")}
        </span>
      </button>

      {phase.status === "error" && (
        <p className="text-xs text-destructive">{phase.message}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={acceptAttr(kind)}
        hidden
        onChange={(event) => handleFiles(event.target.files)}
      />
    </div>
  );
}
