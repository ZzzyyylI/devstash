import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Never touch a real database — mock the Prisma singleton's count calls.
const item = { count: vi.fn() };
const collection = { count: vi.fn() };
vi.mock("@/lib/prisma", () => ({ prisma: { item, collection } }));

const { checkCollectionLimit, checkItemLimit, limitErrorMessage } = await import(
  "@/lib/stripe/limits"
);

beforeEach(() => {
  item.count.mockReset();
  collection.count.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("checkItemLimit", () => {
  it("short-circuits for Pro without counting", async () => {
    await expect(checkItemLimit("user_1", true)).resolves.toEqual({
      allowed: true,
      limit: null,
      current: 0,
    });
    expect(item.count).not.toHaveBeenCalled();
  });

  it("allows a free user below the cap", async () => {
    item.count.mockResolvedValue(10);

    await expect(checkItemLimit("user_1", false)).resolves.toEqual({
      allowed: true,
      limit: 50,
      current: 10,
    });
    expect(item.count).toHaveBeenCalledWith({ where: { userId: "user_1" } });
  });

  it("blocks a free user sitting exactly at the cap", async () => {
    item.count.mockResolvedValue(50);

    await expect(checkItemLimit("user_1", false)).resolves.toEqual({
      allowed: false,
      limit: 50,
      current: 50,
    });
  });

  it("blocks a free user over the cap", async () => {
    item.count.mockResolvedValue(51);

    const check = await checkItemLimit("user_1", false);
    expect(check.allowed).toBe(false);
  });
});

describe("checkCollectionLimit", () => {
  it("short-circuits for Pro without counting", async () => {
    await expect(checkCollectionLimit("user_1", true)).resolves.toEqual({
      allowed: true,
      limit: null,
      current: 0,
    });
    expect(collection.count).not.toHaveBeenCalled();
  });

  it("allows a free user below the cap of 3", async () => {
    collection.count.mockResolvedValue(2);

    await expect(checkCollectionLimit("user_1", false)).resolves.toEqual({
      allowed: true,
      limit: 3,
      current: 2,
    });
    expect(collection.count).toHaveBeenCalledWith({
      where: { userId: "user_1" },
    });
  });

  it("blocks a free user at the cap of 3", async () => {
    collection.count.mockResolvedValue(3);

    const check = await checkCollectionLimit("user_1", false);
    expect(check.allowed).toBe(false);
  });
});

describe("limitErrorMessage", () => {
  it("names the item limit and DevStash Pro", () => {
    const message = limitErrorMessage("item", {
      allowed: false,
      limit: 50,
      current: 50,
    });
    expect(message).toContain("50");
    expect(message).toContain("items");
    expect(message).toContain("DevStash Pro");
  });

  it("names the collection limit and DevStash Pro", () => {
    const message = limitErrorMessage("collection", {
      allowed: false,
      limit: 3,
      current: 3,
    });
    expect(message).toContain("3");
    expect(message).toContain("collections");
    expect(message).toContain("DevStash Pro");
  });
});
