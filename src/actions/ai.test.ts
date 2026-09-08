import { beforeEach, describe, expect, it, vi } from "vitest";

// `@/auth` pulls in the Prisma adapter + full NextAuth instance; the AI helper
// hits OpenAI. Mock everything so the action is tested in isolation.
const auth = vi.fn();
vi.mock("@/auth", () => ({ auth }));

const generateAutoTagsQuery = vi.fn();
vi.mock("@/lib/ai/auto-tags", () => ({ generateAutoTags: generateAutoTagsQuery }));

const isAiConfigured = vi.fn();
vi.mock("@/lib/ai/client", () => ({ isAiConfigured }));

const checkUserRateLimit = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  AI_RATE_LIMIT: { limit: 20, window: "1 h" },
  checkUserRateLimit,
  tooManyAttemptsMessage: () => "Too many attempts. Try again later.",
}));

const { generateAutoTags } = await import("@/actions/ai");

beforeEach(() => {
  auth.mockReset();
  generateAutoTagsQuery.mockReset();
  isAiConfigured.mockReset();
  checkUserRateLimit.mockReset();

  auth.mockResolvedValue({ user: { id: "user_1", isPro: true } });
  isAiConfigured.mockReturnValue(true);
  checkUserRateLimit.mockResolvedValue({ success: true, remaining: 19, reset: 0 });
  generateAutoTagsQuery.mockResolvedValue(["react", "hooks"]);
});

describe("generateAutoTags action", () => {
  it("rejects an unauthenticated caller without calling OpenAI", async () => {
    auth.mockResolvedValue(null);

    const result = await generateAutoTags({ title: "x" });

    expect(result).toEqual({ success: false, error: "You must be signed in." });
    expect(generateAutoTagsQuery).not.toHaveBeenCalled();
  });

  it("rejects a free (non-Pro) user with an upgrade message", async () => {
    auth.mockResolvedValue({ user: { id: "user_1", isPro: false } });

    const result = await generateAutoTags({ title: "x" });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/Pro/);
    expect(generateAutoTagsQuery).not.toHaveBeenCalled();
  });

  it("returns an error when AI is not configured", async () => {
    isAiConfigured.mockReturnValue(false);

    const result = await generateAutoTags({ title: "x" });

    expect(result).toEqual({
      success: false,
      error: "AI features aren't available right now.",
    });
    expect(generateAutoTagsQuery).not.toHaveBeenCalled();
  });

  it("returns the throttle message when rate limited", async () => {
    checkUserRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 60_000,
    });

    const result = await generateAutoTags({ title: "x" });

    expect(result).toEqual({
      success: false,
      error: "Too many attempts. Try again later.",
    });
    expect(generateAutoTagsQuery).not.toHaveBeenCalled();
  });

  it("returns field errors for an empty title", async () => {
    const result = await generateAutoTags({ title: "   " });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.title?.length).toBeGreaterThan(0);
    }
    expect(generateAutoTagsQuery).not.toHaveBeenCalled();
  });

  it("returns suggested tags for the validated payload", async () => {
    const result = await generateAutoTags({
      title: "  useDebounce  ",
      content: "  code  ",
    });

    expect(checkUserRateLimit).toHaveBeenCalledWith({
      name: "ai:auto-tags",
      userId: "user_1",
      limit: 20,
      window: "1 h",
    });
    expect(generateAutoTagsQuery).toHaveBeenCalledWith({
      title: "useDebounce",
      content: "code",
    });
    expect(result).toEqual({ success: true, data: { tags: ["react", "hooks"] } });
  });

  it("returns a generic error when the helper throws", async () => {
    generateAutoTagsQuery.mockRejectedValue(new Error("openai down"));

    const result = await generateAutoTags({ title: "x" });

    expect(result).toEqual({
      success: false,
      error: "Couldn't suggest tags right now. Try again in a moment.",
    });
  });
});
