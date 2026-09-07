import { beforeEach, describe, expect, it, vi } from "vitest";

// Replace the Prisma singleton + demo-user lookup so these tests never touch a
// real database (same pattern as src/lib/tokens.test.ts).
const collection = {
  create: vi.fn(),
  findMany: vi.fn(),
  findFirst: vi.fn(),
};
vi.mock("@/lib/prisma", () => ({
  prisma: { collection },
}));

const getDemoUserId = vi.fn();
vi.mock("@/lib/db/user", () => ({ getDemoUserId }));

const { createCollection, getCollectionOptions, getCollectionById } =
  await import("@/lib/db/collections");

beforeEach(() => {
  collection.create.mockReset();
  collection.findMany.mockReset();
  collection.findFirst.mockReset();
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

describe("getCollectionOptions", () => {
  it("returns an empty list and never queries when there is no demo user", async () => {
    getDemoUserId.mockResolvedValue(null);

    const result = await getCollectionOptions();

    expect(result).toEqual([]);
    expect(collection.findMany).not.toHaveBeenCalled();
  });

  it("returns the user's collections as id+name, ordered by name", async () => {
    const rows = [
      { id: "col_1", name: "AI Workflows" },
      { id: "col_2", name: "React Patterns" },
    ];
    collection.findMany.mockResolvedValue(rows);

    const result = await getCollectionOptions();

    expect(collection.findMany).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    expect(result).toBe(rows);
  });
});

describe("getCollectionById", () => {
  it("returns null and never queries when there is no demo user", async () => {
    getDemoUserId.mockResolvedValue(null);

    const result = await getCollectionById("col_1");

    expect(result).toBeNull();
    expect(collection.findFirst).not.toHaveBeenCalled();
  });

  it("looks the row up scoped to the demo user and returns it", async () => {
    const row = {
      id: "col_1",
      name: "React Patterns",
      description: "notes",
      isFavorite: true,
    };
    collection.findFirst.mockResolvedValue(row);

    const result = await getCollectionById("col_1");

    expect(collection.findFirst).toHaveBeenCalledWith({
      where: { id: "col_1", userId: "user_1" },
      select: {
        id: true,
        name: true,
        description: true,
        isFavorite: true,
      },
    });
    expect(result).toBe(row);
  });

  it("returns null for an id that isn't one of the user's collections", async () => {
    collection.findFirst.mockResolvedValue(null);

    const result = await getCollectionById("nope");

    expect(result).toBeNull();
  });
});
