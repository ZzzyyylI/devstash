import { beforeEach, describe, expect, it, vi } from "vitest";

// `@/auth` pulls in the Prisma adapter + full NextAuth instance; `@/lib/db/items`
// hits Prisma. Mock both so the action is tested in isolation.
const auth = vi.fn();
vi.mock("@/auth", () => ({ auth }));

const updateItemQuery = vi.fn();
vi.mock("@/lib/db/items", () => ({ updateItem: updateItemQuery }));

const { updateItem } = await import("@/actions/items");

const validInput = {
  title: "Updated title",
  description: "",
  content: "",
  url: "",
  language: "",
  tags: ["react"],
};

beforeEach(() => {
  auth.mockReset();
  updateItemQuery.mockReset();
  auth.mockResolvedValue({ user: { id: "user_1" } });
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
    });

    expect(updateItemQuery).toHaveBeenCalledWith("item_1", {
      title: "Updated title",
      description: null,
      content: null,
      url: null,
      language: null,
      tags: ["react"],
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
