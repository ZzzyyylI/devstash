import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { setCollectionFavorite } from "@/lib/db/collections";
import { favoriteCollectionSchema } from "@/lib/validations/collection";
import {
  INVALID_JSON,
  invalidJsonResponse,
  readJsonBody,
  validationErrorResponse,
} from "@/lib/api/request";

/**
 * PATCH /api/collections/[id]/favorite
 *
 * Toggle a collection's favorite flag from the card's three-dots menu or the
 * detail-page header. Requires a signed-in session; the write is scoped to the
 * demo user in the data layer (like the rest of `src/lib/db/collections.ts`).
 * Kept a separate route from `PATCH /api/collections/[id]` (name + description)
 * so neither payload schema has to accommodate the other — same divergence as
 * `POST /api/collections`.
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

  const parsed = favoriteCollectionSchema.safeParse(body);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error, "Invalid favorite value");
  }

  try {
    const collection = await setCollectionFavorite(id, parsed.data.isFavorite);
    if (!collection) {
      return NextResponse.json(
        { success: false, error: "Collection not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: collection });
  } catch (error) {
    console.error("Collection favorite toggle failed:", error);
    return NextResponse.json(
      { success: false, error: "Could not update collection" },
      { status: 500 },
    );
  }
}
