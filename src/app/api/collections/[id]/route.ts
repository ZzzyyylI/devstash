import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { deleteCollection, updateCollection } from "@/lib/db/collections";
import { updateCollectionSchema } from "@/lib/validations/collection";
import {
  INVALID_JSON,
  invalidJsonResponse,
  readJsonBody,
  validationErrorResponse,
} from "@/lib/api/request";

/**
 * PATCH /api/collections/[id]
 *
 * Update a collection's metadata (name + description) from the "Edit collection"
 * dialog. Requires a signed-in session; the write is scoped to the demo user in
 * the data layer (like the rest of `src/lib/db/collections.ts`). Kept as an API
 * route — not a Server Action — to match `POST /api/collections`.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const { id } = await params;

  const body = await readJsonBody(request);
  if (body === INVALID_JSON) return invalidJsonResponse();

  const parsed = updateCollectionSchema.safeParse(body);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error, "Invalid collection details");
  }

  try {
    const collection = await updateCollection(id, parsed.data);
    if (!collection) {
      return NextResponse.json(
        { success: false, error: "Collection not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: collection });
  } catch (error) {
    console.error("Collection update failed:", error);
    return NextResponse.json(
      { success: false, error: "Could not update collection" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/collections/[id]
 *
 * Delete a collection (behind a confirmation dialog). The collection's items are
 * **not** deleted — only the `CollectionItem` join rows cascade away. Requires a
 * signed-in session; the write is demo-user scoped in the data layer.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const { id } = await params;

  try {
    const deleted = await deleteCollection(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Collection not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Collection deletion failed:", error);
    return NextResponse.json(
      { success: false, error: "Could not delete collection" },
      { status: 500 },
    );
  }
}
