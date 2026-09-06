import { auth } from "@/auth";
import { getItemDetail } from "@/lib/db/items";
import { getObject, isR2Configured, toObjectKey } from "@/lib/r2";

export const runtime = "nodejs";

/**
 * GET /api/files/[id]           → inline (used as an <img> src / preview)
 * GET /api/files/[id]?download=1 → attachment (the drawer's Download button)
 *
 * Same-origin proxy for a `file` / `image` item's R2 object. Keeps the bucket
 * private and sidesteps CORS. Requires a signed-in session; the lookup is
 * demo-user scoped (like the rest of `src/lib/db/items.ts`), so an unknown or
 * someone else's id gets a 404.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Not authenticated", { status: 401 });
  }

  if (!isR2Configured()) {
    return new Response("File storage isn't configured", { status: 503 });
  }

  const { id } = await params;
  const item = await getItemDetail(id);
  if (!item || !item.fileUrl) {
    return new Response("Not found", { status: 404 });
  }

  let object;
  try {
    object = await getObject(toObjectKey(item.fileUrl));
  } catch (error) {
    console.error(`Failed to fetch R2 object for item ${id}`, error);
    return new Response("Could not read the file", { status: 502 });
  }

  const download = new URL(request.url).searchParams.get("download") === "1";
  const filename = sanitizeFilename(item.fileName ?? "download");

  const headers = new Headers({
    "Content-Type": object.contentType,
    "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
    "Cache-Control": "private, max-age=3600",
  });
  if (object.contentLength != null) {
    headers.set("Content-Length", String(object.contentLength));
  }

  return new Response(object.body, { status: 200, headers });
}

/** Strip anything that could break out of the `filename="…"` header value. */
function sanitizeFilename(name: string): string {
  return name.replace(/["\\\r\n]/g, "_").slice(0, 200) || "download";
}
