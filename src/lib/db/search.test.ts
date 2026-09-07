import { beforeEach, describe, expect, it, vi } from "vitest";

// getSearchIndex is pure composition over the items + collections query layers,
// so we stub those rather than Prisma.
const getAllItems = vi.fn();
const getSearchCollections = vi.fn();
vi.mock("@/lib/db/items", () => ({ getAllItems }));
vi.mock("@/lib/db/collections", () => ({ getSearchCollections }));

const { getSearchIndex } = await import("@/lib/db/search");

beforeEach(() => {
  getAllItems.mockReset();
  getSearchCollections.mockReset();
});

describe("getSearchIndex", () => {
  it("combines the item and collection datasets into one payload", async () => {
    const items = [{ id: "item_1", title: "useDebounce" }];
    const collections = [{ id: "col_1", name: "React Patterns", itemCount: 2 }];
    getAllItems.mockResolvedValue(items);
    getSearchCollections.mockResolvedValue(collections);

    const result = await getSearchIndex();

    expect(result).toEqual({ items, collections });
  });

  it("returns empty arrays when there is nothing to index", async () => {
    getAllItems.mockResolvedValue([]);
    getSearchCollections.mockResolvedValue([]);

    expect(await getSearchIndex()).toEqual({ items: [], collections: [] });
  });
});
