import { beforeEach, describe, expect, it, vi } from "vitest";

// `@/auth` pulls in the Prisma adapter + full NextAuth instance; the data layer
// hits Prisma. Mock both so the action is tested in isolation.
const auth = vi.fn();
vi.mock("@/auth", () => ({ auth }));

const updateEditorPreferencesQuery = vi.fn();
vi.mock("@/lib/db/editor-preferences", () => ({
  updateEditorPreferences: updateEditorPreferencesQuery,
}));

const { updateEditorPreferences } = await import(
  "@/actions/editor-preferences"
);

const validInput = {
  fontSize: 16,
  tabSize: 4,
  wordWrap: false,
  minimap: true,
  theme: "monokai" as const,
};

beforeEach(() => {
  auth.mockReset();
  updateEditorPreferencesQuery.mockReset();
  auth.mockResolvedValue({ user: { id: "user_1" } });
});

describe("updateEditorPreferences action", () => {
  it("rejects an unauthenticated caller without touching the database", async () => {
    auth.mockResolvedValue(null);

    const result = await updateEditorPreferences(validInput);

    expect(result).toEqual({
      success: false,
      error: "You must be signed in to update editor preferences.",
    });
    expect(updateEditorPreferencesQuery).not.toHaveBeenCalled();
  });

  it("returns field errors for an invalid payload", async () => {
    const result = await updateEditorPreferences({
      ...validInput,
      fontSize: 15,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.fontSize?.length).toBeGreaterThan(0);
    }
    expect(updateEditorPreferencesQuery).not.toHaveBeenCalled();
  });

  it("persists the validated payload for the session user and echoes it back", async () => {
    updateEditorPreferencesQuery.mockResolvedValue(validInput);

    const result = await updateEditorPreferences(validInput);

    expect(updateEditorPreferencesQuery).toHaveBeenCalledWith(
      "user_1",
      validInput,
    );
    expect(result).toEqual({ success: true, data: validInput });
  });

  it("returns a generic error when the query throws", async () => {
    updateEditorPreferencesQuery.mockRejectedValue(new Error("db down"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await updateEditorPreferences(validInput);

    expect(result).toEqual({
      success: false,
      error: "Something went wrong saving your preferences.",
    });
    consoleError.mockRestore();
  });
});
