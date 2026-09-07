import type { UploadKind } from "@/lib/file-constraints";

/** A completed upload — stored in the create form and sent to `createItem`. */
export interface UploadedFile {
  key: string;
  name: string;
  size: number;
}

interface UploadOptions {
  /** Called with 0–100 as bytes are sent. */
  onProgress?: (percent: number) => void;
  /** Abort the in-flight request. */
  signal?: AbortSignal;
}

/**
 * POST a file to `/api/upload` as multipart form data, reporting upload
 * progress. Uses `XMLHttpRequest` (not `fetch`) so `upload.onprogress` reflects
 * real bytes sent.
 *
 * Resolves with the stored object ref. Rejects with an `Error` whose message is
 * user-facing on a non-2xx response or a network failure, and with an
 * `AbortError` `DOMException` when `signal` aborts.
 */
export function uploadFile(
  kind: UploadKind,
  file: File,
  { onProgress, signal }: UploadOptions = {},
): Promise<UploadedFile> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const body = new FormData();
    body.append("file", file);
    body.append("kind", kind);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let payload: {
        success?: boolean;
        error?: string;
        data?: { key: string; fileName: string; fileSize: number };
      } = {};
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        /* fall through to the generic error below */
      }

      if (xhr.status >= 200 && xhr.status < 300 && payload.data) {
        resolve({
          key: payload.data.key,
          name: payload.data.fileName,
          size: payload.data.fileSize,
        });
      } else {
        reject(new Error(payload.error ?? "Upload failed. Try again."));
      }
    };

    xhr.onerror = () =>
      reject(new Error("Upload failed. Check your connection."));
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));

    signal?.addEventListener("abort", () => xhr.abort(), { once: true });

    xhr.send(body);
  });
}
