"use server";

import { runAiAction } from "@/lib/actions/ai-action";
import type { ActionResult } from "@/lib/actions/types";
import { generateAutoTags as generateAutoTagsQuery } from "@/lib/ai/auto-tags";
import { generateItemDescription as generateItemDescriptionQuery } from "@/lib/ai/description";
import { explainCode as explainCodeQuery } from "@/lib/ai/explain";
import {
  optimizePrompt as optimizePromptQuery,
  type OptimizePromptResult,
} from "@/lib/ai/optimize-prompt";
import {
  autoTagSchema,
  describeItemSchema,
  explainCodeSchema,
  optimizePromptSchema,
} from "@/lib/validations/ai";

const PRO_REQUIRED_MESSAGE =
  "AI auto-tagging is a DevStash Pro feature. Upgrade to use it.";

const PRO_DESCRIBE_MESSAGE =
  "AI descriptions are a DevStash Pro feature. Upgrade to use it.";

const PRO_EXPLAIN_MESSAGE =
  "AI code explanations are a DevStash Pro feature. Upgrade to use it.";

const PRO_OPTIMIZE_MESSAGE =
  "AI prompt optimization is a DevStash Pro feature. Upgrade to use it.";

/**
 * Suggest 3-5 freeform tags for an item from its title + content, via OpenAI.
 *
 * Nothing is written — the caller merges accepted tags into the in-progress
 * form and saves through the existing create/update path. See {@link runAiAction}
 * for the gate order.
 */
export async function generateAutoTags(
  input: unknown,
): Promise<ActionResult<{ tags: string[] }>> {
  return runAiAction(input, {
    actionName: "generateAutoTags",
    rateLimitName: "ai:auto-tags",
    proMessage: PRO_REQUIRED_MESSAGE,
    schema: autoTagSchema,
    run: async (data) => ({ tags: await generateAutoTagsQuery(data) }),
    failError: "Couldn't suggest tags right now. Try again in a moment.",
  });
}

/**
 * Draft a concise 1-2 sentence description for an item from its in-progress form
 * values (title + type, plus whichever of content / url / language / an existing
 * description apply), via OpenAI.
 *
 * Nothing is written — the caller drops the returned string into the form's
 * Description field. See {@link runAiAction} for the gate order.
 */
export async function generateItemDescription(
  input: unknown,
): Promise<ActionResult<{ description: string }>> {
  return runAiAction(input, {
    actionName: "generateItemDescription",
    rateLimitName: "ai:description",
    proMessage: PRO_DESCRIBE_MESSAGE,
    schema: describeItemSchema,
    run: async (data) => {
      const description = await generateItemDescriptionQuery(data);
      return description ? { description } : null;
    },
    emptyError:
      "Couldn't draft a description from this item yet. Add a bit more detail and try again.",
    failError: "Couldn't draft a description right now. Try again in a moment.",
  });
}

/**
 * Explain a code snippet or terminal command — a concise (~200-300 word)
 * Markdown write-up of what it does and the key concepts behind it, via OpenAI.
 *
 * Nothing is written — the item drawer regenerates the explanation on each click
 * and shows it inline via a Code / Explain tab toggle. See {@link runAiAction}
 * for the gate order.
 */
export async function explainCode(
  input: unknown,
): Promise<ActionResult<{ explanation: string }>> {
  return runAiAction(input, {
    actionName: "explainCode",
    rateLimitName: "ai:explain",
    proMessage: PRO_EXPLAIN_MESSAGE,
    schema: explainCodeSchema,
    run: async (data) => {
      const explanation = await explainCodeQuery(data);
      return explanation ? { explanation } : null;
    },
    emptyError: "Couldn't explain this code yet. Try again in a moment.",
    failError: "Couldn't explain this code right now. Try again in a moment.",
  });
}

/**
 * Refine a `prompt`-type item's text — return a clearer, more specific rewrite
 * that keeps the original intent, via OpenAI. `changed` is `false` when the
 * prompt is already well-written.
 *
 * Nothing is written — the item drawer shows the suggestion inline and only
 * persists it through the existing `updateItem` path when the user accepts. See
 * {@link runAiAction} for the gate order.
 */
export async function optimizePrompt(
  input: unknown,
): Promise<ActionResult<OptimizePromptResult>> {
  return runAiAction(input, {
    actionName: "optimizePrompt",
    rateLimitName: "ai:optimize-prompt",
    proMessage: PRO_OPTIMIZE_MESSAGE,
    schema: optimizePromptSchema,
    run: async (data) => {
      const result = await optimizePromptQuery(data);
      return result.optimized ? result : null;
    },
    emptyError: "Couldn't optimize this prompt yet. Try again in a moment.",
    failError: "Couldn't optimize this prompt right now. Try again in a moment.",
  });
}
