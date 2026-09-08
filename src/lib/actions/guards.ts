import type { ZodType } from "zod";

import { auth } from "@/auth";

import type { ActionResult } from "./types";

/**
 * A step that either produces a value or short-circuits the action with a ready
 * `ActionResult` error. Callers do `if (!step.ok) return step.result;`.
 */
export type Guarded<T> =
  | { ok: true; value: T }
  | { ok: false; result: ActionResult<never> };

/** The bits of the session every action needs. */
export interface ActionUser {
  id: string;
  isPro: boolean;
}

/**
 * Require a signed-in session. On failure returns the `signedOutMessage` as an
 * `ActionResult` error; on success yields `{ id, isPro }` (never the raw
 * session).
 *
 * The message is a parameter because the item actions use call-site-specific
 * copy ("to create items", "to edit items", …).
 */
export async function requireUser(
  signedOutMessage = "You must be signed in.",
): Promise<Guarded<ActionUser>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, result: { success: false, error: signedOutMessage } };
  }
  return {
    ok: true,
    value: { id: session.user.id, isPro: Boolean(session.user.isPro) },
  };
}

/**
 * Parse `input` with `schema`. On failure returns the standard
 * `{ success: false, error, fieldErrors }` shape; on success yields the parsed
 * (and normalised) data.
 */
export function parseInput<T>(
  schema: ZodType<T>,
  input: unknown,
  message = "Please fix the highlighted fields.",
): Guarded<T> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      result: {
        success: false,
        error: message,
        fieldErrors: parsed.error.flatten().fieldErrors as Record<
          string,
          string[]
        >,
      },
    };
  }
  return { ok: true, value: parsed.data };
}

/**
 * Run a data-layer mutation and map its outcome to an `ActionResult`:
 *
 * - a falsy result (`null` / `false`) → `messages.notFound`
 * - a thrown error → logged as `<actionName> action failed` + `messages.failed`
 * - otherwise → `{ success: true, data }`
 *
 * `op` returns the final `data` payload (not necessarily the raw query result),
 * so a caller like `deleteItem` can do
 * `() => (await deleteItemQuery(id)) && { id }`.
 */
export async function runMutation<T>(
  actionName: string,
  op: () => Promise<T | null | false | undefined>,
  messages: { notFound: string; failed: string },
): Promise<ActionResult<T>> {
  try {
    const data = await op();
    if (!data) {
      return { success: false, error: messages.notFound };
    }
    return { success: true, data };
  } catch (error) {
    console.error(`${actionName} action failed`, error);
    return { success: false, error: messages.failed };
  }
}
