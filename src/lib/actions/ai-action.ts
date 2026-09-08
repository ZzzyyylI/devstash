import type { ZodType } from "zod";

import { isAiConfigured } from "@/lib/ai/client";
import {
  AI_RATE_LIMIT,
  checkUserRateLimit,
  tooManyAttemptsMessage,
} from "@/lib/rate-limit";

import { parseInput, requireUser } from "./guards";
import type { ActionResult } from "./types";

export interface AiActionConfig<TIn, TOut> {
  /** Used as the `console.error` label when `run` throws. */
  actionName: string;
  /** Rate-limit bucket, e.g. `"ai:auto-tags"`. */
  rateLimitName: string;
  /** Shown to a free (non-Pro) caller. */
  proMessage: string;
  schema: ZodType<TIn>;
  /**
   * Runs the OpenAI call and shapes the success payload. Return `null` to signal
   * "no usable output from the model" → `emptyError`.
   */
  run: (data: TIn) => Promise<TOut | null>;
  /** Used when `run` resolves `null` (defaults to `failError`). */
  emptyError?: string;
  /** Used when `run` throws. */
  failError: string;
}

/**
 * The shared body for the AI Server Actions (`src/actions/ai.ts`).
 *
 * Gates in cheapest-first order — signed-in → Pro → AI configured → per-user
 * rate limit (`AI_RATE_LIMIT`, 20/hour, shared budget) → Zod — then calls
 * `config.run`. Every branch returns an `ActionResult` the forms surface as a
 * toast. Nothing is written here; the caller decides what to do with the result.
 */
export async function runAiAction<TIn, TOut>(
  input: unknown,
  config: AiActionConfig<TIn, TOut>,
): Promise<ActionResult<TOut>> {
  const user = await requireUser();
  if (!user.ok) return user.result;

  if (!user.value.isPro) {
    return { success: false, error: config.proMessage };
  }

  if (!isAiConfigured()) {
    return { success: false, error: "AI features aren't available right now." };
  }

  const rl = await checkUserRateLimit({
    name: config.rateLimitName,
    userId: user.value.id,
    limit: AI_RATE_LIMIT.limit,
    window: AI_RATE_LIMIT.window,
  });
  if (!rl.success) {
    return { success: false, error: tooManyAttemptsMessage(rl.reset) };
  }

  const parsed = parseInput(config.schema, input);
  if (!parsed.ok) return parsed.result;

  try {
    const data = await config.run(parsed.value);
    if (data == null) {
      return {
        success: false,
        error: config.emptyError ?? config.failError,
      };
    }
    return { success: true, data };
  } catch (error) {
    console.error(`${config.actionName} action failed`, error);
    return { success: false, error: config.failError };
  }
}
