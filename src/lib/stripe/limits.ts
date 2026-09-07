import { prisma } from "@/lib/prisma";

import { PLAN_LIMITS } from "@/lib/stripe/plans";

/**
 * Free-plan usage-limit checks for item / collection creation.
 *
 * Helpers are **`userId`-first** — they take an explicit id rather than reading
 * `getDemoUserId()` — so they stay correct once the dashboard data layer is
 * session-scoped (see the spec's "Scope caveat"). Phase 2 wires these into the
 * create paths; Phase 1 only builds and tests them.
 *
 * The comparison is strictly `<`, run **before** the insert: a free user sitting
 * at exactly 50 items is blocked from creating the 51st.
 */

export interface LimitCheck {
  /** `false` once the user is at or over the free cap (Pro is always `true`). */
  allowed: boolean;
  /** The applicable cap, or `null` for Pro (unlimited). */
  limit: number | null;
  /** The user's current count. `0` for Pro (never queried). */
  current: number;
}

/**
 * Can this user create another item? Pro short-circuits with **no**
 * `prisma.item.count` call; free users are counted and compared to
 * `PLAN_LIMITS.free.items`.
 */
export async function checkItemLimit(
  userId: string,
  isPro: boolean,
): Promise<LimitCheck> {
  if (isPro) return { allowed: true, limit: null, current: 0 };

  const current = await prisma.item.count({ where: { userId } });
  const limit = PLAN_LIMITS.free.items;
  return { allowed: current < limit, limit, current };
}

/**
 * Can this user create another collection? Same shape as {@link checkItemLimit},
 * against `prisma.collection.count` / `PLAN_LIMITS.free.collections`.
 */
export async function checkCollectionLimit(
  userId: string,
  isPro: boolean,
): Promise<LimitCheck> {
  if (isPro) return { allowed: true, limit: null, current: 0 };

  const current = await prisma.collection.count({ where: { userId } });
  const limit = PLAN_LIMITS.free.collections;
  return { allowed: current < limit, limit, current };
}

/**
 * User-facing message for a blocked create, e.g.
 * `"You've reached the free plan limit of 50 items. Upgrade to DevStash Pro for
 * unlimited items."`
 */
export function limitErrorMessage(
  kind: "item" | "collection",
  check: LimitCheck,
): string {
  const noun = kind === "item" ? "items" : "collections";
  return `You've reached the free plan limit of ${check.limit} ${noun}. Upgrade to DevStash Pro for unlimited ${noun}.`;
}
