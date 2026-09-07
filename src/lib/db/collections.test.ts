import { beforeEach, describe, expect, it, vi } from "vitest";

// Replace the Prisma singleton + demo-user lookup so these tests never touch a
// real database (same pattern as src/lib/tokens.test.ts).
const collection = {
  create: vi.fn(),
  findMany: vi.fn(),
  findFirst: vi.fn(),
  updateMany: vi.fn(),
  deleteMany: vi.fn(),
};
vi.mock("@/lib/prisma", () => ({
  prisma: { collection },
}));

const getDemoUserId = vi.fn();
vi.mock("@/lib/db/user", () => ({ getDemoUserId }));

const {
  createCollection,
  getCollectionOptions,
  getCollectionById,
  getSearchCollections,
  updateCollection,
  deleteCollection,
} = await import("@/lib/db/collections");

beforeEach(() => {
  collection.create.mockReset();
  collection.findMany.mockReset();
  collection.findFirst.mockReset();
  collection.updateMany.mockReset();
  collection.deleteMany.mockReset();
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

describe("getSearchCollections", () => {
  it("returns an empty list and never queries when there is no demo user", async () => {
    getDemoUserId.mockResolvedValue(null);

    const result = await getSearchCollections();

    expect(result).toEqual([]);
    expect(collection.findMany).not.toHaveBeenCalled();
  });

  it("returns id + name + item count, ordered by name", async () => {
    collection.findMany.mockResolvedValue([
      { id: "col_1", name: "AI Workflows", _count: { items: 3 } },
      { id: "col_2", name: "React Patterns", _count: { items: 0 } },
    ]);

    const result = await getSearchCollections();

    expect(collection.findMany).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, _count: { select: { items: true } } },
    });
    expect(result).toEqual([
      { id: "col_1", name: "AI Workflows", itemCount: 3 },
      { id: "col_2", name: "React Patterns", itemCount: 0 },
    ]);
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

describe("updateCollection", () => {
  it("returns null and never writes when there is no demo user", async () => {
    getDemoUserId.mockResolvedValue(null);

    const result = await updateCollection("col_1", {
      name: "New",
      description: null,
    });

    expect(result).toBeNull();
    expect(collection.updateMany).not.toHaveBeenCalled();
  });

  it("updates the row scoped to the demo user and returns the fresh row", async () => {
    collection.updateMany.mockResolvedValue({ count: 1 });
    const row = {
      id: "col_1",
      name: "Renamed",
      description: "notes",
      isFavorite: false,
    };
    collection.findFirst.mockResolvedValue(row);

    const result = await updateCollection("col_1", {
      name: "Renamed",
      description: "notes",
    });

    expect(collection.updateMany).toHaveBeenCalledWith({
      where: { id: "col_1", userId: "user_1" },
      data: { name: "Renamed", description: "notes" },
    });
    expect(collection.findFirst).toHaveBeenCalledWith({
      where: { id: "col_1", userId: "user_1" },
      select: { id: true, name: true, description: true, isFavorite: true },
    });
    expect(result).toBe(row);
  });

  it("returns null without re-reading when nothing matched (foreign id)", async () => {
    collection.updateMany.mockResolvedValue({ count: 0 });

    const result = await updateCollection("nope", {
      name: "X",
      description: null,
    });

    expect(result).toBeNull();
    expect(collection.findFirst).not.toHaveBeenCalled();
  });
});

describe("deleteCollection", () => {
  it("returns false and never writes when there is no demo user", async () => {
    getDemoUserId.mockResolvedValue(null);

    const result = await deleteCollection("col_1");

    expect(result).toBe(false);
    expect(collection.deleteMany).not.toHaveBeenCalled();
  });

  it("deletes the row scoped to the demo user", async () => {
    collection.deleteMany.mockResolvedValue({ count: 1 });

    const result = await deleteCollection("col_1");

    expect(collection.deleteMany).toHaveBeenCalledWith({
      where: { id: "col_1", userId: "user_1" },
    });
    expect(result).toBe(true);
  });

  it("returns false for an id that isn't one of the user's collections", async () => {
    collection.deleteMany.mockResolvedValue({ count: 0 });

    expect(await deleteCollection("nope")).toBe(false);
  });
});
