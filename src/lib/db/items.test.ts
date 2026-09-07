import { beforeEach, describe, expect, it, vi } from "vitest";

// Replace the Prisma singleton + demo-user lookup so these tests never touch a
// real database (same pattern as src/lib/db/collections.test.ts). R2 is mocked
// too — items.ts imports it for the file-delete path, unused here.
const item = {
  findMany: vi.fn(),
};
vi.mock("@/lib/prisma", () => ({
  prisma: { item },
}));

const getDemoUserId = vi.fn();
vi.mock("@/lib/db/user", () => ({ getDemoUserId }));

vi.mock("@/lib/r2", () => ({
  deleteObject: vi.fn(),
  toObjectKey: vi.fn((v: string) => v),
}));

const { getItemsByCollection, getAllItems } = await import("@/lib/db/items");

beforeEach(() => {
  item.findMany.mockReset();
  getDemoUserId.mockReset();
  getDemoUserId.mockResolvedValue("user_1");
});

function itemRecord() {
  return {
    id: "item_1",
    title: "useDebounce",
    description: null,
    content: "export function useDebounce() {}",
    url: null,
    isFavorite: false,
    isPinned: false,
    type: { id: "type_snippet", name: "snippet", icon: null, color: "#38bdf8" },
    tags: [{ tag: { name: "react" } }, { tag: { name: "hooks" } }],
    fileName: null,
    fileSize: null,
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    updatedAt: new Date("2026-09-02T00:00:00.000Z"),
  };
}

describe("getItemsByCollection", () => {
  it("returns an empty list and never queries when there is no demo user", async () => {
    getDemoUserId.mockResolvedValue(null);

    const result = await getItemsByCollection("col_1");

    expect(result).toEqual([]);
    expect(item.findMany).not.toHaveBeenCalled();
  });

  it("filters by the CollectionItem join, scoped to the demo user, newest first", async () => {
    item.findMany.mockResolvedValue([]);

    await getItemsByCollection("col_1");

    expect(item.findMany).toHaveBeenCalledWith({
      where: { userId: "user_1", collections: { some: { collectionId: "col_1" } } },
      orderBy: { updatedAt: "desc" },
      include: {
        type: { select: { id: true, name: true, icon: true, color: true } },
        tags: { include: { tag: { select: { name: true } } } },
      },
    });
  });

  it("maps rows to the ItemWithType card shape (tags flattened)", async () => {
    item.findMany.mockResolvedValue([itemRecord()]);

    const result = await getItemsByCollection("col_1");

    expect(result).toEqual([
      {
        id: "item_1",
        title: "useDebounce",
        description: null,
        content: "export function useDebounce() {}",
        url: null,
        isFavorite: false,
        isPinned: false,
        type: {
          id: "type_snippet",
          name: "snippet",
          icon: null,
          color: "#38bdf8",
        },
        tags: ["react", "hooks"],
        fileName: null,
        fileSize: null,
        createdAt: new Date("2026-09-01T00:00:00.000Z"),
        updatedAt: new Date("2026-09-02T00:00:00.000Z"),
      },
    ]);
  });
});

describe("getAllItems", () => {
  it("returns an empty list and never queries when there is no demo user", async () => {
    getDemoUserId.mockResolvedValue(null);

    const result = await getAllItems();

    expect(result).toEqual([]);
    expect(item.findMany).not.toHaveBeenCalled();
  });

  it("fetches every item for the demo user, newest first, with type + tags", async () => {
    item.findMany.mockResolvedValue([itemRecord()]);

    const result = await getAllItems();

    expect(item.findMany).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      orderBy: { updatedAt: "desc" },
      include: {
        type: { select: { id: true, name: true, icon: true, color: true } },
        tags: { include: { tag: { select: { name: true } } } },
      },
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "item_1", tags: ["react", "hooks"] });
  });
});
