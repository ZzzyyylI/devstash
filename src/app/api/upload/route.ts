import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { buildObjectKey, isR2Configured, putObject } from "@/lib/r2";
import { validateUpload, type UploadKind } from "@/lib/file-constraints";

export const runtime = "nodejs";

/** Cap the request body a bit above the largest allowed file (10 MB). */
const MAX_BODY_BYTES = 12 * 1024 * 1024;

/**
 * POST /api/upload  (multipart/form-data: `file`, `kind`)
 *
 * Streams an uploaded file/image into Cloudflare R2 and returns its object key
 * for the "New Item" dialog to hand to the `createItem` action. Kept as an API
 * route (not a Server Action) so the browser can track upload progress via
 * `XMLHttpRequest`.
 *
 * Requires a signed-in session. Objects stay private — they're served back only
 * through `GET /api/files/[id]`.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "You must be signed in to upload files." },
      { status: 401 },
    );
  }

  if (!isR2Configured()) {
    return NextResponse.json(
      { success: false, error: "File uploads aren't configured on this server." },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, error: "Expected a multipart form upload." },
      { status: 400 },
    );
  }

  const kindRaw = form.get("kind");
  const kind: UploadKind | null =
    kindRaw === "image" || kindRaw === "file" ? kindRaw : null;
  if (!kind) {
    return NextResponse.json(
      { success: false, error: "Missing or invalid upload kind." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { success: false, error: "No file in the request." },
      { status: 400 },
    );
  }

  if (file.size > MAX_BODY_BYTES) {
    return NextResponse.json(
      { success: false, error: "That file is too large." },
      { status: 413 },
    );
  }

  const check = validateUpload(kind, {
    name: file.name,
    size: file.size,
    type: file.type,
  });
  if (!check.ok) {
    return NextResponse.json(
      { success: false, error: check.error },
      { status: 400 },
    );
  }

  const key = buildObjectKey(session.user.id, kind, check.extension);
  const contentType =
    file.type && file.type !== "application/octet-stream"
      ? file.type
      : fallbackContentType(kind, check.extension);

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    await putObject(key, bytes, contentType);
  } catch (error) {
    console.error("R2 upload failed", error);
    return NextResponse.json(
      { success: false, error: "Upload failed. Try again." },
      { status: 502 },
    );
  }

  return NextResponse.json(
    {
      success: true,
      data: { key, fileName: file.name, fileSize: file.size, contentType },
    },
    { status: 201 },
  );
}

/** A sensible `Content-Type` when the browser didn't provide one. */
function fallbackContentType(kind: UploadKind, extension: string): string {
  const map: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".json": "application/json",
    ".yaml": "text/yaml",
    ".yml": "text/yaml",
    ".xml": "application/xml",
    ".csv": "text/csv",
    ".toml": "text/plain",
    ".ini": "text/plain",
  };
  return map[extension] ?? (kind === "image" ? "image/*" : "application/octet-stream");
}
