import { beforeEach, describe, expect, it, vi } from "vitest";

// Replace the Prisma singleton so these tests never touch a real database.
const user = {
  findUnique: vi.fn(),
  update: vi.fn(),
};
vi.mock("@/lib/prisma", () => ({ prisma: { user } }));

const { getEditorPreferences, updateEditorPreferences } = await import(
  "@/lib/db/editor-preferences"
);
const { DEFAULT_EDITOR_PREFERENCES } = await import("@/lib/editor-preferences");

const stored = {
  fontSize: 16,
  tabSize: 4,
  wordWrap: false,
  minimap: true,
  theme: "github-dark" as const,
};

beforeEach(() => {
  user.findUnique.mockReset();
  user.update.mockReset();
});

describe("getEditorPreferences", () => {
  it("returns the defaults without a query when no user id is given", async () => {
    await expect(getEditorPreferences(null)).resolves.toEqual(
      DEFAULT_EDITOR_PREFERENCES,
    );
    expect(user.findUnique).not.toHaveBeenCalled();
  });

  it("normalises the stored JSON blob", async () => {
    user.findUnique.mockResolvedValue({
      editorPreferences: { ...stored, fontSize: 999 },
    });

    await expect(getEditorPreferences("user_1")).resolves.toEqual({
      ...stored,
      fontSize: DEFAULT_EDITOR_PREFERENCES.fontSize,
    });
    expect(user.findUnique).toHaveBeenCalledWith({
      where: { id: "user_1" },
      select: { editorPreferences: true },
    });
  });

  it("returns the defaults when the column is null", async () => {
    user.findUnique.mockResolvedValue({ editorPreferences: null });
    await expect(getEditorPreferences("user_1")).resolves.toEqual(
      DEFAULT_EDITOR_PREFERENCES,
    );
  });
});

describe("updateEditorPreferences", () => {
  it("writes the payload and returns the normalised round-trip", async () => {
    user.update.mockResolvedValue({ editorPreferences: stored });

    await expect(updateEditorPreferences("user_1", stored)).resolves.toEqual(
      stored,
    );
    expect(user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { editorPreferences: stored },
      select: { editorPreferences: true },
    });
  });
});
