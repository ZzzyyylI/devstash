import { beforeEach, describe, expect, it, vi } from "vitest";

// `@/auth` pulls in the Prisma adapter + full NextAuth instance; `@/lib/db/items`
// hits Prisma. Mock both so the action is tested in isolation.
const auth = vi.fn();
vi.mock("@/auth", () => ({ auth }));

const createItemQuery = vi.fn();
const updateItemQuery = vi.fn();
const deleteItemQuery = vi.fn();
const setItemFavoriteQuery = vi.fn();
vi.mock("@/lib/db/items", () => ({
  createItem: createItemQuery,
  updateItem: updateItemQuery,
  deleteItem: deleteItemQuery,
  setItemFavorite: setItemFavoriteQuery,
}));

// `@/lib/stripe/limits` hits Prisma for the free-plan count — mock it. The
// limits module has its own unit test (`src/lib/stripe/limits.test.ts`).
const checkItemLimit = vi.fn();
vi.mock("@/lib/stripe/limits", () => ({
  checkItemLimit,
  limitErrorMessage: (kind: "item" | "collection") =>
    `You've reached the free plan limit of ${kind}s.`,
}));

const { createItem, updateItem, deleteItem, setItemFavorite } = await import(
  "@/actions/items"
);

const validInput = {
  title: "Updated title",
  description: "",
  content: "",
  url: "",
  language: "",
  tags: ["react"],
  collectionIds: [],
};

beforeEach(() => {
  auth.mockReset();
  createItemQuery.mockReset();
  updateItemQuery.mockReset();
  deleteItemQuery.mockReset();
  setItemFavoriteQuery.mockReset();
  checkItemLimit.mockReset();
  auth.mockResolvedValue({ user: { id: "user_1", isPro: false } });
  checkItemLimit.mockResolvedValue({ allowed: true, limit: 50, current: 3 });
});

describe("createItem action", () => {
  const validCreate = {
    type: "snippet",
    title: "New snippet",
    description: "",
    content: "console.log(1)",
    language: "ts",
    url: "",
    tags: ["react"],
    collectionIds: [],
  };

  it("rejects an unauthenticated caller without touching the database", async () => {
    auth.mockResolvedValue(null);

    const result = await createItem(validCreate);

    expect(result).toEqual({
      success: false,
      error: "You must be signed in to create items.",
    });
    expect(createItemQuery).not.toHaveBeenCalled();
  });

  it("returns field errors for an invalid type", async () => {
    const result = await createItem({ ...validCreate, type: "spaceship" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.type?.length).toBeGreaterThan(0);
    }
    expect(createItemQuery).not.toHaveBeenCalled();
  });

  it("requires a URL for a link item", async () => {
    const result = await createItem({
      ...validCreate,
      type: "link",
      url: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.url?.[0]).toMatch(/valid URL/i);
    }
    expect(createItemQuery).not.toHaveBeenCalled();
  });

  it("passes the normalised payload to the query and returns the fresh detail", async () => {
    const detail = { id: "item_1", title: "New snippet" };
    createItemQuery.mockResolvedValue(detail);

    const result = await createItem({
      ...validCreate,
      title: "  New snippet  ",
      tags: [" react ", "react", ""],
      collectionIds: [" col_1 ", "col_1", ""],
    });

    expect(createItemQuery).toHaveBeenCalledWith({
      type: "snippet",
      title: "New snippet",
      description: null,
      content: "console.log(1)",
      language: "ts",
      url: null,
      tags: ["react"],
      collectionIds: ["col_1"],
    });
    expect(result).toEqual({ success: true, data: detail });
  });

  it("forwards the upload fields for a file item", async () => {
    auth.mockResolvedValue({ user: { id: "user_1", isPro: true } });
    const detail = { id: "item_2", title: "Spec.pdf" };
    createItemQuery.mockResolvedValue(detail);

    const result = await createItem({
      type: "file",
      title: "Spec.pdf",
      description: "",
      content: "",
      language: "",
      url: "",
      tags: [],
      fileKey: "uploads/user_1/file/abc.pdf",
      fileName: "Spec.pdf",
      fileSize: 4096,
    });

    expect(createItemQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "file",
        fileKey: "uploads/user_1/file/abc.pdf",
        fileName: "Spec.pdf",
        fileSize: 4096,
      }),
    );
    expect(result).toEqual({ success: true, data: detail });
  });

  it("rejects a file item with no upload", async () => {
    const result = await createItem({ ...validCreate, type: "file", content: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.fileKey?.length).toBeGreaterThan(0);
    }
    expect(createItemQuery).not.toHaveBeenCalled();
  });

  it("maps a null query result to a generic error", async () => {
    createItemQuery.mockResolvedValue(null);

    const result = await createItem(validCreate);

    expect(result).toEqual({
      success: false,
      error: "Something went wrong creating the item.",
    });
  });

  it("returns a generic error when the query throws", async () => {
    createItemQuery.mockRejectedValue(new Error("db down"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await createItem(validCreate);

    expect(result).toEqual({
      success: false,
      error: "Something went wrong creating the item.",
    });
    consoleError.mockRestore();
  });

  it("blocks a free user who is at the item limit", async () => {
    checkItemLimit.mockResolvedValue({ allowed: false, limit: 50, current: 50 });

    const result = await createItem(validCreate);

    expect(checkItemLimit).toHaveBeenCalledWith("user_1", false);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("free plan limit");
    expect(createItemQuery).not.toHaveBeenCalled();
  });

  it("blocks a file item for a non-Pro user", async () => {
    const result = await createItem({
      type: "file",
      title: "Spec.pdf",
      description: "",
      content: "",
      language: "",
      url: "",
      tags: [],
      fileKey: "uploads/user_1/file/abc.pdf",
      fileName: "Spec.pdf",
      fileSize: 4096,
    });

    expect(result).toEqual({
      success: false,
      error: "File uploads are a Pro feature. Upgrade to attach files.",
    });
    expect(createItemQuery).not.toHaveBeenCalled();
  });

  it("passes isPro through to the limit check", async () => {
    auth.mockResolvedValue({ user: { id: "user_1", isPro: true } });
    createItemQuery.mockResolvedValue({ id: "item_9" });

    await createItem(validCreate);

    expect(checkItemLimit).toHaveBeenCalledWith("user_1", true);
  });
});

describe("updateItem action", () => {
  it("rejects an unauthenticated caller without touching the database", async () => {
    auth.mockResolvedValue(null);

    const result = await updateItem("item_1", validInput);

    expect(result).toEqual({
      success: false,
      error: "You must be signed in to edit items.",
    });
    expect(updateItemQuery).not.toHaveBeenCalled();
  });

  it("returns field errors for an invalid payload", async () => {
    const result = await updateItem("item_1", { ...validInput, title: "  " });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.title?.[0]).toMatch(/required/i);
    }
    expect(updateItemQuery).not.toHaveBeenCalled();
  });

  it("rejects a missing item id", async () => {
    const result = await updateItem("", validInput);

    expect(result).toEqual({ success: false, error: "Missing item id." });
    expect(updateItemQuery).not.toHaveBeenCalled();
  });

  it("passes the normalised payload to the query and returns the fresh detail", async () => {
    const detail = { id: "item_1", title: "Updated title" };
    updateItemQuery.mockResolvedValue(detail);

    const result = await updateItem("item_1", {
      ...validInput,
      title: "  Updated title  ",
      tags: [" react ", "react", ""],
      collectionIds: [" col_1 ", "col_2", "col_1"],
    });

    expect(updateItemQuery).toHaveBeenCalledWith("item_1", {
      title: "Updated title",
      description: null,
      content: null,
      url: null,
      language: null,
      tags: ["react"],
      collectionIds: ["col_1", "col_2"],
    });
    expect(result).toEqual({ success: true, data: detail });
  });

  it("maps a null query result (not the demo user's item) to a not-found error", async () => {
    updateItemQuery.mockResolvedValue(null);

    const result = await updateItem("item_1", validInput);

    expect(result).toEqual({ success: false, error: "Item not found." });
  });

  it("returns a generic error when the query throws", async () => {
    updateItemQuery.mockRejectedValue(new Error("db down"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await updateItem("item_1", validInput);

    expect(result).toEqual({
      success: false,
      error: "Something went wrong saving the item.",
    });
    consoleError.mockRestore();
  });
});

describe("setItemFavorite action", () => {
  it("rejects an unauthenticated caller without touching the database", async () => {
    auth.mockResolvedValue(null);

    const result = await setItemFavorite("item_1", true);

    expect(result).toEqual({
      success: false,
      error: "You must be signed in to update items.",
    });
    expect(setItemFavoriteQuery).not.toHaveBeenCalled();
  });

  it("rejects a missing item id", async () => {
    const result = await setItemFavorite("", true);

    expect(result).toEqual({ success: false, error: "Missing item id." });
    expect(setItemFavoriteQuery).not.toHaveBeenCalled();
  });

  it("rejects a non-boolean favorite value", async () => {
    const result = await setItemFavorite(
      "item_1",
      "yes" as unknown as boolean,
    );

    expect(result).toEqual({
      success: false,
      error: "Invalid favorite value.",
    });
    expect(setItemFavoriteQuery).not.toHaveBeenCalled();
  });

  it("toggles the flag and returns the fresh detail", async () => {
    const detail = { id: "item_1", isFavorite: true };
    setItemFavoriteQuery.mockResolvedValue(detail);

    const result = await setItemFavorite("item_1", true);

    expect(setItemFavoriteQuery).toHaveBeenCalledWith("item_1", true);
    expect(result).toEqual({ success: true, data: detail });
  });

  it("maps a null query result (not the demo user's item) to a not-found error", async () => {
    setItemFavoriteQuery.mockResolvedValue(null);

    const result = await setItemFavorite("item_1", false);

    expect(result).toEqual({ success: false, error: "Item not found." });
  });

  it("returns a generic error when the query throws", async () => {
    setItemFavoriteQuery.mockRejectedValue(new Error("db down"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await setItemFavorite("item_1", true);

    expect(result).toEqual({
      success: false,
      error: "Something went wrong updating the item.",
    });
    consoleError.mockRestore();
  });
});

describe("deleteItem action", () => {
  it("rejects an unauthenticated caller without touching the database", async () => {
    auth.mockResolvedValue(null);

    const result = await deleteItem("item_1");

    expect(result).toEqual({
      success: false,
      error: "You must be signed in to delete items.",
    });
    expect(deleteItemQuery).not.toHaveBeenCalled();
  });

  it("rejects a missing item id", async () => {
    const result = await deleteItem("");

    expect(result).toEqual({ success: false, error: "Missing item id." });
    expect(deleteItemQuery).not.toHaveBeenCalled();
  });

  it("deletes the item and echoes its id back", async () => {
    deleteItemQuery.mockResolvedValue(true);

    const result = await deleteItem("item_1");

    expect(deleteItemQuery).toHaveBeenCalledWith("item_1");
    expect(result).toEqual({ success: true, data: { id: "item_1" } });
  });

  it("maps a false query result (not the demo user's item) to a not-found error", async () => {
    deleteItemQuery.mockResolvedValue(false);

    const result = await deleteItem("item_1");

    expect(result).toEqual({ success: false, error: "Item not found." });
  });

  it("returns a generic error when the query throws", async () => {
    deleteItemQuery.mockRejectedValue(new Error("db down"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await deleteItem("item_1");

    expect(result).toEqual({
      success: false,
      error: "Something went wrong deleting the item.",
    });
    consoleError.mockRestore();
  });
});
