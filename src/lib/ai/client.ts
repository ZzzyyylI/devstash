import OpenAI from "openai";

/**
 * OpenAI SDK singleton for the DevStash Pro AI features (auto-tagging first).
 *
 * Mirrors `getStripe()` / `getRedis()`: it **fails soft**. When
 * `OPENAI_API_KEY` isn't set, `getOpenAI()` returns `null` (and warns once)
 * instead of throwing, so the AI server actions can return a friendly
 * `{ success: false }` and nothing else in the app breaks.
 *
 * The key is server-only — never expose it with a `NEXT_PUBLIC_` prefix.
 */

/** The model id, pinned in one place so swapping it is a one-line change. */
export const AI_MODEL = "gpt-5-nano" as const;

// `undefined` = not yet resolved; `null` = resolved, no API key (disabled).
let client: OpenAI | null | undefined;

/**
 * The configured OpenAI client, or `null` when `OPENAI_API_KEY` is unset.
 * Resolved once and reused; the "not configured" warning is logged a single
 * time.
 */
export function getOpenAI(): OpenAI | null {
  if (client !== undefined) return client;

  const apiKey = process.env.OPENAI_API_KEY;
  client = apiKey
    ? new OpenAI({ apiKey, maxRetries: 2, timeout: 20_000 })
    : null;

  if (!client) {
    console.warn(
      "[ai] OPENAI_API_KEY not set — AI features are disabled.",
    );
  }
  return client;
}

/** Cheap boolean guard for entrypoints that just need to know if AI is on. */
export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}
