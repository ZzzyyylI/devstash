import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { createCollection, getCollectionOptions } from "@/lib/db/collections";
import { createCollectionSchema } from "@/lib/validations/collection";
import {
  INVALID_JSON,
  invalidJsonResponse,
  readJsonBody,
  validationErrorResponse,
} from "@/lib/api/request";

/**
 * GET /api/collections
 *
 * The signed-in user's collections as `{ id, name }`, for the item form's
 * collection picker. Scoped to the demo user in the data layer, like POST.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const data = await getCollectionOptions();
  return NextResponse.json({ success: true, data });
}

/**
 * POST /api/collections
 *
 * Create a collection from the "New Collection" dialog. Requires a signed-in
 * session; the write itself is scoped to the demo user (like the rest of
 * `src/lib/db/collections.ts`). Kept as an API route — not a Server Action —
 * so the client dialog has a plain fetch endpoint, mirroring the auth routes.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const body = await readJsonBody(request);
  if (body === INVALID_JSON) return invalidJsonResponse();

  const parsed = createCollectionSchema.safeParse(body);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error, "Invalid collection details");
  }

  try {
    const collection = await createCollection(parsed.data);
    if (!collection) {
      return NextResponse.json(
        { success: false, error: "Could not create collection" },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { success: true, data: collection },
      { status: 201 },
    );
  } catch (error) {
    console.error("Collection creation failed:", error);
    return NextResponse.json(
      { success: false, error: "Could not create collection" },
      { status: 500 },
    );
  }
}
