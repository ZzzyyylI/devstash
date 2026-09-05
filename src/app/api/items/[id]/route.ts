import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getItemDetail } from "@/lib/db/items";

/**
 * GET /api/items/[id]
 *
 * Full detail for a single item, for the item drawer. Requires a signed-in
 * session; the query itself is scoped to the demo user (like the rest of
 * `src/lib/db/items.ts`), so an unknown or someone else's id gets a 404.
 */
export async function GET(
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
  const item = await getItemDetail(id);
  if (!item) {
    return NextResponse.json(
      { success: false, error: "Item not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, data: item });
}
