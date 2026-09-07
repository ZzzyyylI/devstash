import { beforeEach, describe, expect, it, vi } from "vitest";

// Replace the Prisma singleton + demo-user lookup so these tests never touch a
// real database (same pattern as src/lib/db/collections.test.ts). R2 is mocked
// too — items.ts imports it for the file-delete path, unused here.
const item = {
  findMany: vi.fn(),
  findFirst: vi.fn(),
  updateMany: vi.fn(),
  count: vi.fn(),
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

const {
  getItemsByType,
  getItemsByCollection,
  getAllItems,
  getFavoriteItems,
  setItemFavorite,
} = await import("@/lib/db/items");

beforeEach(() => {
  item.findMany.mockReset();
  item.findFirst.mockReset();
  item.updateMany.mockReset();
  item.count.mockReset();
  item.count.mockResolvedValue(0);
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

const INCLUDE = {
  type: { select: { id: true, name: true, icon: true, color: true } },
  tags: { include: { tag: { select: { name: true } } } },
};

describe("getItemsByCollection", () => {
  it("returns an empty page and never queries when there is no demo user", async () => {
    getDemoUserId.mockResolvedValue(null);

    const result = await getItemsByCollection("col_1");

    expect(result).toEqual({ items: [], page: 1, pageCount: 1, total: 0 });
    expect(item.count).not.toHaveBeenCalled();
    expect(item.findMany).not.toHaveBeenCalled();
  });

  it("filters by the CollectionItem join, scoped to the demo user, newest first", async () => {
    item.count.mockResolvedValue(0);
    item.findMany.mockResolvedValue([]);

    await getItemsByCollection("col_1");

    const scoped = {
      userId: "user_1",
      collections: { some: { collectionId: "col_1" } },
    };
    expect(item.count).toHaveBeenCalledWith({ where: scoped });
    expect(item.findMany).toHaveBeenCalledWith({
      where: scoped,
      orderBy: { updatedAt: "desc" },
      skip: 0,
      take: 21,
      include: INCLUDE,
    });
  });

  it("maps rows to the ItemWithType card shape (tags flattened) inside a page envelope", async () => {
    item.count.mockResolvedValue(1);
    item.findMany.mockResolvedValue([itemRecord()]);

    const result = await getItemsByCollection("col_1");

    expect(result).toEqual({
      page: 1,
      pageCount: 1,
      total: 1,
      items: [
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
      ],
    });
  });
});

describe("getItemsByType pagination", () => {
  it("skips whole pages and reports the page count", async () => {
    item.count.mockResolvedValue(50); // 3 pages at 21/page
    item.findMany.mockResolvedValue([]);

    const result = await getItemsByType("type_snippet", 2);

    expect(item.findMany).toHaveBeenCalledWith({
      where: { userId: "user_1", typeId: "type_snippet" },
      orderBy: { updatedAt: "desc" },
      skip: 21,
      take: 21,
      include: INCLUDE,
    });
    expect(result).toMatchObject({ page: 2, pageCount: 3, total: 50 });
  });

  it("clamps a request past the last page", async () => {
    item.count.mockResolvedValue(50);
    item.findMany.mockResolvedValue([]);

    const result = await getItemsByType("type_snippet", 99);

    expect(result).toMatchObject({ page: 3, pageCount: 3 });
    expect(item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 42, take: 21 }),
    );
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
      include: INCLUDE,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "item_1", tags: ["react", "hooks"] });
  });
});

describe("setItemFavorite", () => {
  it("returns null and never writes when there is no demo user", async () => {
    getDemoUserId.mockResolvedValue(null);

    const result = await setItemFavorite("item_1", true);

    expect(result).toBeNull();
    expect(item.updateMany).not.toHaveBeenCalled();
  });

  it("updates the flag scoped to the demo user and returns the fresh detail", async () => {
    item.updateMany.mockResolvedValue({ count: 1 });
    item.findFirst.mockResolvedValue({
      ...itemRecord(),
      isFavorite: true,
      collections: [],
    });

    const result = await setItemFavorite("item_1", true);

    expect(item.updateMany).toHaveBeenCalledWith({
      where: { id: "item_1", userId: "user_1" },
      data: { isFavorite: true },
    });
    expect(result).toMatchObject({ id: "item_1", isFavorite: true });
  });

  it("returns null without re-reading when nothing matched (foreign id)", async () => {
    item.updateMany.mockResolvedValue({ count: 0 });

    const result = await setItemFavorite("nope", true);

    expect(result).toBeNull();
    expect(item.findFirst).not.toHaveBeenCalled();
  });
});

describe("getFavoriteItems", () => {
  it("returns an empty list and never queries when there is no demo user", async () => {
    getDemoUserId.mockResolvedValue(null);

    const result = await getFavoriteItems();

    expect(result).toEqual([]);
    expect(item.findMany).not.toHaveBeenCalled();
  });

  it("fetches the demo user's favorited items, newest first, with type + tags", async () => {
    item.findMany.mockResolvedValue([itemRecord()]);

    const result = await getFavoriteItems();

    expect(item.findMany).toHaveBeenCalledWith({
      where: { userId: "user_1", isFavorite: true },
      orderBy: { updatedAt: "desc" },
      include: INCLUDE,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "item_1", tags: ["react", "hooks"] });
  });
});
