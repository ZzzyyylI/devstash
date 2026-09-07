import { describe, expect, it } from "vitest";

import type { ItemWithType } from "@/lib/db/items";
import type { FavoriteCollection } from "@/lib/db/collections";
import {
  DEFAULT_FAVORITE_SORT,
  defaultDirForKey,
  sortFavoriteCollections,
  sortFavoriteItems,
} from "@/lib/favorites-sort";

function item(over: {
  title: string;
  id?: string;
  typeName?: string;
  updatedAt?: Date;
}): ItemWithType {
  const {
    title,
    id = title,
    typeName = "snippet",
    updatedAt = new Date("2026-01-01"),
  } = over;
  return {
    id,
    title,
    description: null,
    content: null,
    url: null,
    isFavorite: true,
    isPinned: false,
    type: { id: `type_${typeName}`, name: typeName, icon: null, color: null },
    tags: [],
    fileName: null,
    fileSize: null,
    createdAt: new Date("2026-01-01"),
    updatedAt,
  };
}

function collection(name: string, updatedAt: Date): FavoriteCollection {
  return { id: name, name, itemCount: 0, updatedAt };
}

const names = (rows: { title?: string; name?: string }[]) =>
  rows.map((r) => r.title ?? r.name);

describe("defaultDirForKey", () => {
  it("starts dates descending and text ascending", () => {
    expect(defaultDirForKey("date")).toBe("desc");
    expect(defaultDirForKey("name")).toBe("asc");
    expect(defaultDirForKey("type")).toBe("asc");
  });

  it("DEFAULT_FAVORITE_SORT is date / desc (today's order)", () => {
    expect(DEFAULT_FAVORITE_SORT).toEqual({ key: "date", dir: "desc" });
  });
});

describe("sortFavoriteItems", () => {
  const items = [
    item({ title: "banana", typeName: "prompt", updatedAt: new Date("2026-03-01") }),
    item({ title: "apple", typeName: "snippet", updatedAt: new Date("2026-01-01") }),
    item({ title: "cherry", typeName: "prompt", updatedAt: new Date("2026-02-01") }),
  ];

  it("sorts by name, case-insensitively, both directions", () => {
    expect(names(sortFavoriteItems(items, "name", "asc"))).toEqual([
      "apple",
      "banana",
      "cherry",
    ]);
    expect(names(sortFavoriteItems(items, "name", "desc"))).toEqual([
      "cherry",
      "banana",
      "apple",
    ]);
  });

  it("sorts by date (asc = oldest first, desc = newest first)", () => {
    expect(names(sortFavoriteItems(items, "date", "asc"))).toEqual([
      "apple",
      "cherry",
      "banana",
    ]);
    expect(names(sortFavoriteItems(items, "date", "desc"))).toEqual([
      "banana",
      "cherry",
      "apple",
    ]);
  });

  it("sorts by type name, tie-broken by title", () => {
    expect(names(sortFavoriteItems(items, "type", "asc"))).toEqual([
      "banana", // prompt, title < cherry
      "cherry", // prompt
      "apple", // snippet
    ]);
  });

  it("does not mutate the input array", () => {
    const input = [...items];
    const sorted = sortFavoriteItems(input, "name", "asc");
    expect(input).toEqual(items);
    expect(sorted).not.toBe(input);
  });

  it("is stable for equal keys (keeps input order)", () => {
    const same = [
      item({ title: "Note", id: "first", updatedAt: new Date("2026-01-01") }),
      item({ title: "Note", id: "second", updatedAt: new Date("2026-01-01") }),
    ];
    expect(sortFavoriteItems(same, "name", "asc").map((i) => i.id)).toEqual([
      "first",
      "second",
    ]);
    expect(sortFavoriteItems(same, "name", "desc").map((i) => i.id)).toEqual([
      "first",
      "second",
    ]);
  });
});

describe("sortFavoriteCollections", () => {
  const collections = [
    collection("Zeta", new Date("2026-01-01")),
    collection("alpha", new Date("2026-03-01")),
    collection("Mu", new Date("2026-02-01")),
  ];

  it("sorts by name, case-insensitively", () => {
    expect(names(sortFavoriteCollections(collections, "name", "asc"))).toEqual([
      "alpha",
      "Mu",
      "Zeta",
    ]);
  });

  it("falls back to name for the 'type' key (collections have no type)", () => {
    expect(names(sortFavoriteCollections(collections, "type", "asc"))).toEqual(
      names(sortFavoriteCollections(collections, "name", "asc")),
    );
  });

  it("sorts by date", () => {
    expect(names(sortFavoriteCollections(collections, "date", "desc"))).toEqual([
      "alpha",
      "Mu",
      "Zeta",
    ]);
  });

  it("does not mutate the input array", () => {
    const input = [...collections];
    sortFavoriteCollections(input, "date", "asc");
    expect(input).toEqual(collections);
  });
});
