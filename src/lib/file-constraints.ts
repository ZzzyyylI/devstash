/**
 * Upload constraints for the `file` and `image` item types, shared by the
 * client-side `FileUpload` guard and the `/api/upload` route (the route is the
 * source of truth — the browser check is just there for a fast error).
 *
 * Extension + size are authoritative; the MIME allow-list is a secondary check
 * that also tolerates a blank or generic `application/octet-stream` type, since
 * browsers disagree on the type for `.md`, `.toml`, `.ini`, `.yaml`, …
 */

export type UploadKind = "image" | "file";

export interface UploadConstraint {
  /** Largest accepted payload, in bytes. */
  maxBytes: number;
  /** Accepted lower-case extensions, leading dot included. */
  extensions: readonly string[];
  /** Recognised MIME types (a blank / octet-stream type is also allowed). */
  mimeTypes: readonly string[];
}

export const IMAGE_CONSTRAINT: UploadConstraint = {
  maxBytes: 5 * 1024 * 1024,
  extensions: [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
  mimeTypes: [
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ],
};

export const FILE_CONSTRAINT: UploadConstraint = {
  maxBytes: 10 * 1024 * 1024,
  extensions: [
    ".pdf",
    ".txt",
    ".md",
    ".json",
    ".yaml",
    ".yml",
    ".xml",
    ".csv",
    ".toml",
    ".ini",
  ],
  mimeTypes: [
    "application/pdf",
    "text/plain",
    "text/markdown",
    "application/json",
    "application/x-yaml",
    "text/yaml",
    "application/xml",
    "text/xml",
    "text/csv",
    "application/toml",
  ],
};

export function constraintFor(kind: UploadKind): UploadConstraint {
  return kind === "image" ? IMAGE_CONSTRAINT : FILE_CONSTRAINT;
}

/** Lower-case extension (with dot) of a filename, or "" when there is none. */
export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) return "";
  return name.slice(dot).toLowerCase();
}

/** The `accept` attribute value for a file input of this kind. */
export function acceptAttr(kind: UploadKind): string {
  return constraintFor(kind).extensions.join(",");
}

/** Human-readable byte size, e.g. `1.4 MB`. */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

export interface UploadCandidate {
  name: string;
  size: number;
  /** The browser-reported MIME type (often `""`). */
  type?: string;
}

export type UploadValidation =
  | { ok: true; extension: string }
  | { ok: false; error: string };

/**
 * Validate a candidate upload against its kind's constraints. Extension and size
 * are enforced strictly; the MIME type only fails the check when it is present
 * *and* clearly belongs to a different family.
 */
export function validateUpload(
  kind: UploadKind,
  candidate: UploadCandidate,
): UploadValidation {
  const constraint = constraintFor(kind);
  const extension = extensionOf(candidate.name);

  if (!extension || !constraint.extensions.includes(extension)) {
    return {
      ok: false,
      error: `Unsupported ${kind} type. Allowed: ${constraint.extensions.join(", ")}`,
    };
  }

  if (!Number.isFinite(candidate.size) || candidate.size <= 0) {
    return { ok: false, error: "That file looks empty." };
  }

  if (candidate.size > constraint.maxBytes) {
    return {
      ok: false,
      error: `Too large — ${kind === "image" ? "images" : "files"} must be under ${formatBytes(constraint.maxBytes)}.`,
    };
  }

  const mime = (candidate.type ?? "").toLowerCase().split(";")[0].trim();
  const genericMime = mime === "" || mime === "application/octet-stream";
  if (!genericMime && !constraint.mimeTypes.includes(mime)) {
    // Tolerate any text/* for the text-ish file extensions; otherwise reject.
    const textLike = kind === "file" && mime.startsWith("text/");
    if (!textLike) {
      return { ok: false, error: `Unexpected content type "${mime}".` };
    }
  }

  return { ok: true, extension };
}
