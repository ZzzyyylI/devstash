import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const auth = vi.fn();
vi.mock("@/auth", () => ({ auth }));

const isAiConfigured = vi.fn();
vi.mock("@/lib/ai/client", () => ({ isAiConfigured }));

const checkUserRateLimit = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  AI_RATE_LIMIT: { limit: 20, window: "1 h" },
  checkUserRateLimit,
  tooManyAttemptsMessage: () => "Too many attempts. Try again later.",
}));

const { runAiAction } = await import("./ai-action");

const schema = z.object({ title: z.string().trim().min(1) });

type Cfg = Parameters<typeof runAiAction<{ title: string }, unknown>>[1];

function config(over: Partial<Cfg> = {}): Cfg {
  return {
    actionName: "doAi",
    rateLimitName: "ai:test",
    proMessage: "That's a Pro feature.",
    schema,
    run: vi.fn(async () => ({ ok: true })),
    failError: "It broke.",
    ...over,
  };
}

beforeEach(() => {
  auth.mockReset();
  isAiConfigured.mockReset();
  checkUserRateLimit.mockReset();

  auth.mockResolvedValue({ user: { id: "user_1", isPro: true } });
  isAiConfigured.mockReturnValue(true);
  checkUserRateLimit.mockResolvedValue({ success: true, remaining: 19, reset: 0 });
});

describe("runAiAction", () => {
  it("rejects an unauthenticated caller before running anything", async () => {
    auth.mockResolvedValue(null);
    const cfg = config();

    const result = await runAiAction({ title: "x" }, cfg);

    expect(result).toEqual({ success: false, error: "You must be signed in." });
    expect(cfg.run).not.toHaveBeenCalled();
  });

  it("rejects a non-Pro user with the configured proMessage", async () => {
    auth.mockResolvedValue({ user: { id: "user_1", isPro: false } });
    const cfg = config();

    const result = await runAiAction({ title: "x" }, cfg);

    expect(result).toEqual({ success: false, error: "That's a Pro feature." });
    expect(cfg.run).not.toHaveBeenCalled();
  });

  it("rejects when AI is not configured", async () => {
    isAiConfigured.mockReturnValue(false);
    const cfg = config();

    const result = await runAiAction({ title: "x" }, cfg);

    expect(result).toEqual({
      success: false,
      error: "AI features aren't available right now.",
    });
    expect(cfg.run).not.toHaveBeenCalled();
  });

  it("passes the bucket name + user id + AI window to the rate limiter", async () => {
    checkUserRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 60_000,
    });
    const cfg = config();

    const result = await runAiAction({ title: "x" }, cfg);

    expect(checkUserRateLimit).toHaveBeenCalledWith({
      name: "ai:test",
      userId: "user_1",
      limit: 20,
      window: "1 h",
    });
    expect(result).toEqual({
      success: false,
      error: "Too many attempts. Try again later.",
    });
    expect(cfg.run).not.toHaveBeenCalled();
  });

  it("returns field errors for an invalid payload", async () => {
    const cfg = config();

    const result = await runAiAction({ title: "   " }, cfg);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.title?.length).toBeGreaterThan(0);
    }
    expect(cfg.run).not.toHaveBeenCalled();
  });

  it("runs with the normalised data and wraps the result", async () => {
    const run = vi.fn(async () => ({ tags: ["a"] }));
    const cfg = config({ run });

    const result = await runAiAction({ title: "  hi  " }, cfg);

    expect(run).toHaveBeenCalledWith({ title: "hi" });
    expect(result).toEqual({ success: true, data: { tags: ["a"] } });
  });

  it("maps a null run result to emptyError when set", async () => {
    const cfg = config({
      run: vi.fn(async () => null),
      emptyError: "Nothing usable.",
    });

    const result = await runAiAction({ title: "x" }, cfg);

    expect(result).toEqual({ success: false, error: "Nothing usable." });
  });

  it("falls back to failError for a null run result with no emptyError", async () => {
    const cfg = config({ run: vi.fn(async () => null) });

    const result = await runAiAction({ title: "x" }, cfg);

    expect(result).toEqual({ success: false, error: "It broke." });
  });

  it("logs and maps a thrown run to failError", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const cfg = config({
      run: vi.fn(async () => {
        throw new Error("openai down");
      }),
    });

    const result = await runAiAction({ title: "x" }, cfg);

    expect(result).toEqual({ success: false, error: "It broke." });
    expect(consoleError).toHaveBeenCalledWith(
      "doAi action failed",
      expect.any(Error),
    );
    consoleError.mockRestore();
  });
});
