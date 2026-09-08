"use server";

import { auth } from "@/auth";
import { generateAutoTags as generateAutoTagsQuery } from "@/lib/ai/auto-tags";
import { isAiConfigured } from "@/lib/ai/client";
import {
  AI_RATE_LIMIT,
  checkUserRateLimit,
  tooManyAttemptsMessage,
} from "@/lib/rate-limit";
import { autoTagSchema } from "@/lib/validations/ai";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

const PRO_REQUIRED_MESSAGE =
  "AI auto-tagging is a DevStash Pro feature. Upgrade to use it.";

/**
 * Suggest 3-5 freeform tags for an item from its title + content, via OpenAI.
 *
 * Gates in cheapest-first order: signed-in → Pro → AI configured → per-user
 * rate limit (20/hour) → Zod. On any failure it returns the `ActionResult`
 * error string the forms surface as a toast. Nothing is written — the caller
 * merges accepted tags into the in-progress form and saves through the existing
 * create/update path.
 */
export async function generateAutoTags(
  input: unknown,
): Promise<ActionResult<{ tags: string[] }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in." };
  }

  if (!session.user.isPro) {
    return { success: false, error: PRO_REQUIRED_MESSAGE };
  }

  if (!isAiConfigured()) {
    return { success: false, error: "AI features aren't available right now." };
  }

  const rl = await checkUserRateLimit({
    name: "ai:auto-tags",
    userId: session.user.id,
    limit: AI_RATE_LIMIT.limit,
    window: AI_RATE_LIMIT.window,
  });
  if (!rl.success) {
    return { success: false, error: tooManyAttemptsMessage(rl.reset) };
  }

  const parsed = autoTagSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const tags = await generateAutoTagsQuery(parsed.data);
    return { success: true, data: { tags } };
  } catch (error) {
    console.error("generateAutoTags action failed", error);
    return {
      success: false,
      error: "Couldn't suggest tags right now. Try again in a moment.",
    };
  }
}
