import { cache } from "react";

import { prisma } from "@/lib/prisma";

// Auth isn't wired up yet — the dashboard shows this single demo user's data,
// matching the seed script (see prisma/seed.ts).
const DEMO_USER_EMAIL = "demo@devstash.io";

/**
 * The demo user's id. Wrapped in React's `cache()` so the many dashboard
 * queries that each need it (items, collections, stats, sidebar) share one
 * lookup per request instead of re-querying Neon for every call.
 */
export const getDemoUserId = cache(async (): Promise<string | null> => {
  const user = await prisma.user.findUnique({
    where: { email: DEMO_USER_EMAIL },
    select: { id: true },
  });
  return user?.id ?? null;
});
