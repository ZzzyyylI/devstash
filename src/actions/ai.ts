"use server";

import { auth } from "@/auth";
import { generateAutoTags as generateAutoTagsQuery } from "@/lib/ai/auto-tags";
import { generateItemDescription as generateItemDescriptionQuery } from "@/lib/ai/description";
import { explainCode as explainCodeQuery } from "@/lib/ai/explain";
import { isAiConfigured } from "@/lib/ai/client";
import {
  AI_RATE_LIMIT,
  checkUserRateLimit,
  tooManyAttemptsMessage,
} from "@/lib/rate-limit";
import {
  autoTagSchema,
  describeItemSchema,
  explainCodeSchema,
} from "@/lib/validations/ai";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

const PRO_REQUIRED_MESSAGE =
  "AI auto-tagging is a DevStash Pro feature. Upgrade to use it.";

const PRO_DESCRIBE_MESSAGE =
  "AI descriptions are a DevStash Pro feature. Upgrade to use it.";

const PRO_EXPLAIN_MESSAGE =
  "AI code explanations are a DevStash Pro feature. Upgrade to use it.";

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

/**
 * Draft a concise 1-2 sentence description for an item from its in-progress form
 * values (title + type, plus whichever of content / url / language / an existing
 * description apply), via OpenAI.
 *
 * Same gate order as {@link generateAutoTags}: signed-in → Pro → AI configured →
 * per-user rate limit (20/hour, shared budget) → Zod. Nothing is written — the
 * caller drops the returned string into the form's Description field and saves
 * through the existing create/update path.
 */
export async function generateItemDescription(
  input: unknown,
): Promise<ActionResult<{ description: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in." };
  }

  if (!session.user.isPro) {
    return { success: false, error: PRO_DESCRIBE_MESSAGE };
  }

  if (!isAiConfigured()) {
    return { success: false, error: "AI features aren't available right now." };
  }

  const rl = await checkUserRateLimit({
    name: "ai:description",
    userId: session.user.id,
    limit: AI_RATE_LIMIT.limit,
    window: AI_RATE_LIMIT.window,
  });
  if (!rl.success) {
    return { success: false, error: tooManyAttemptsMessage(rl.reset) };
  }

  const parsed = describeItemSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const description = await generateItemDescriptionQuery(parsed.data);
    if (!description) {
      return {
        success: false,
        error:
          "Couldn't draft a description from this item yet. Add a bit more detail and try again.",
      };
    }
    return { success: true, data: { description } };
  } catch (error) {
    console.error("generateItemDescription action failed", error);
    return {
      success: false,
      error: "Couldn't draft a description right now. Try again in a moment.",
    };
  }
}

/**
 * Explain a code snippet or terminal command — a concise (~200-300 word)
 * Markdown write-up of what it does and the key concepts behind it, via OpenAI.
 *
 * Same gate order as {@link generateAutoTags}: signed-in → Pro → AI configured →
 * per-user rate limit (20/hour, shared AI budget) → Zod. Nothing is written —
 * the item drawer regenerates the explanation on each click and shows it inline
 * via a Code / Explain tab toggle.
 */
export async function explainCode(
  input: unknown,
): Promise<ActionResult<{ explanation: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in." };
  }

  if (!session.user.isPro) {
    return { success: false, error: PRO_EXPLAIN_MESSAGE };
  }

  if (!isAiConfigured()) {
    return { success: false, error: "AI features aren't available right now." };
  }

  const rl = await checkUserRateLimit({
    name: "ai:explain",
    userId: session.user.id,
    limit: AI_RATE_LIMIT.limit,
    window: AI_RATE_LIMIT.window,
  });
  if (!rl.success) {
    return { success: false, error: tooManyAttemptsMessage(rl.reset) };
  }

  const parsed = explainCodeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const explanation = await explainCodeQuery(parsed.data);
    if (!explanation) {
      return {
        success: false,
        error:
          "Couldn't explain this code yet. Try again in a moment.",
      };
    }
    return { success: true, data: { explanation } };
  } catch (error) {
    console.error("explainCode action failed", error);
    return {
      success: false,
      error: "Couldn't explain this code right now. Try again in a moment.",
    };
  }
}
