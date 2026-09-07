import { beforeEach, describe, expect, it, vi } from "vitest";

// Replace the Prisma singleton + demo-user lookup so these tests never touch a
// real database (same pattern as src/lib/tokens.test.ts).
const collection = {
  create: vi.fn(),
};
vi.mock("@/lib/prisma", () => ({
  prisma: { collection },
}));

const getDemoUserId = vi.fn();
vi.mock("@/lib/db/user", () => ({ getDemoUserId }));

const { createCollection } = await import("@/lib/db/collections");

beforeEach(() => {
  collection.create.mockReset();
  getDemoUserId.mockReset();
  getDemoUserId.mockResolvedValue("user_1");
});

describe("createCollection", () => {
  it("returns null and never writes when there is no demo user", async () => {
    getDemoUserId.mockResolvedValue(null);

    const result = await createCollection({ name: "A", description: null });

    expect(result).toBeNull();
    expect(collection.create).not.toHaveBeenCalled();
  });

  it("creates a user-scoped row and returns it", async () => {
    const row = {
      id: "col_1",
      name: "React Patterns",
      description: "notes",
      isFavorite: false,
    };
    collection.create.mockResolvedValue(row);

    const result = await createCollection({
      name: "React Patterns",
      description: "notes",
    });

    expect(collection.create).toHaveBeenCalledWith({
      data: { name: "React Patterns", description: "notes", userId: "user_1" },
      select: { id: true, name: true, description: true, isFavorite: true },
    });
    expect(result).toBe(row);
  });

  it("passes a null description straight through to the write", async () => {
    collection.create.mockResolvedValue({
      id: "col_2",
      name: "DevOps",
      description: null,
      isFavorite: false,
    });

    await createCollection({ name: "DevOps", description: null });

    expect(collection.create.mock.calls[0][0].data).toEqual({
      name: "DevOps",
      description: null,
      userId: "user_1",
    });
  });
});
