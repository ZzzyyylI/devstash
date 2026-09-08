import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

// `@/auth` pulls in the Prisma adapter + full NextAuth instance — mock it.
const auth = vi.fn();
vi.mock("@/auth", () => ({ auth }));

const { requireUser, parseInput, runMutation } = await import("./guards");

beforeEach(() => {
  auth.mockReset();
});

describe("requireUser", () => {
  it("short-circuits with the given message when there is no session", async () => {
    auth.mockResolvedValue(null);

    const step = await requireUser("You must be signed in to frobnicate.");

    expect(step).toEqual({
      ok: false,
      result: {
        success: false,
        error: "You must be signed in to frobnicate.",
      },
    });
  });

  it("short-circuits with the default message when the user has no id", async () => {
    auth.mockResolvedValue({ user: {} });

    const step = await requireUser();

    expect(step).toEqual({
      ok: false,
      result: { success: false, error: "You must be signed in." },
    });
  });

  it("yields the id and a boolean-coerced isPro on success", async () => {
    auth.mockResolvedValue({ user: { id: "user_1", isPro: true } });

    const step = await requireUser();

    expect(step).toEqual({ ok: true, value: { id: "user_1", isPro: true } });
  });

  it("defaults isPro to false when the session omits it", async () => {
    auth.mockResolvedValue({ user: { id: "user_1" } });

    const step = await requireUser();

    expect(step).toEqual({ ok: true, value: { id: "user_1", isPro: false } });
  });
});

describe("parseInput", () => {
  const schema = z.object({ name: z.string().trim().min(1) });

  it("yields the parsed + normalised value on success", () => {
    const step = parseInput(schema, { name: "  Ada  " });

    expect(step).toEqual({ ok: true, value: { name: "Ada" } });
  });

  it("returns the standard field-error shape on failure", () => {
    const step = parseInput(schema, { name: "  " });

    expect(step.ok).toBe(false);
    if (!step.ok) {
      expect(step.result.success).toBe(false);
      if (!step.result.success) {
        expect(step.result.error).toBe("Please fix the highlighted fields.");
        expect(step.result.fieldErrors?.name?.length).toBeGreaterThan(0);
      }
    }
  });

  it("uses a custom failure message when given", () => {
    const step = parseInput(schema, {}, "Bad settings.");

    expect(step.ok).toBe(false);
    if (!step.ok && !step.result.success) {
      expect(step.result.error).toBe("Bad settings.");
    }
  });
});

describe("runMutation", () => {
  it("wraps a truthy result as success data", async () => {
    const result = await runMutation("doThing", async () => ({ id: "x" }), {
      notFound: "nope",
      failed: "boom",
    });

    expect(result).toEqual({ success: true, data: { id: "x" } });
  });

  it("maps a null result to the notFound message", async () => {
    const result = await runMutation("doThing", async () => null, {
      notFound: "nope",
      failed: "boom",
    });

    expect(result).toEqual({ success: false, error: "nope" });
  });

  it("maps a false result to the notFound message", async () => {
    const result = await runMutation("doThing", async () => false as const, {
      notFound: "nope",
      failed: "boom",
    });

    expect(result).toEqual({ success: false, error: "nope" });
  });

  it("logs and maps a thrown error to the failed message", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const result = await runMutation(
      "doThing",
      async () => {
        throw new Error("db down");
      },
      { notFound: "nope", failed: "boom" },
    );

    expect(result).toEqual({ success: false, error: "boom" });
    expect(consoleError).toHaveBeenCalledWith(
      "doThing action failed",
      expect.any(Error),
    );
    consoleError.mockRestore();
  });
});
