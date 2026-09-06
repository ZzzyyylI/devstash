import { describe, expect, it } from "vitest";

import { updateItemSchema } from "@/lib/validations/item";

const base = {
  title: "My item",
  description: "",
  content: "",
  url: "",
  language: "",
  tags: [] as string[],
};

describe("updateItemSchema", () => {
  it("trims the title and requires it to be non-empty", () => {
    expect(updateItemSchema.parse({ ...base, title: "  Hello  " }).title).toBe(
      "Hello",
    );

    const result = updateItemSchema.safeParse({ ...base, title: "   " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.title?.[0]).toMatch(/required/i);
    }
  });

  it("collapses blank description / language to null and trims otherwise", () => {
    const parsed = updateItemSchema.parse({
      ...base,
      description: "   ",
      language: "  ts  ",
    });
    expect(parsed.description).toBeNull();
    expect(parsed.language).toBe("ts");
  });

  it("keeps internal whitespace in content but nulls a blank value", () => {
    expect(
      updateItemSchema.parse({ ...base, content: "  \n  " }).content,
    ).toBeNull();
    expect(
      updateItemSchema.parse({ ...base, content: "  line1\n    line2  " })
        .content,
    ).toBe("  line1\n    line2  ");
  });

  it("accepts an empty URL as null and a valid URL as-is", () => {
    expect(updateItemSchema.parse({ ...base, url: "" }).url).toBeNull();
    expect(
      updateItemSchema.parse({ ...base, url: " https://example.com/x " }).url,
    ).toBe("https://example.com/x");
  });

  it("rejects a malformed URL", () => {
    const result = updateItemSchema.safeParse({ ...base, url: "not a url" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.url?.[0]).toMatch(/valid URL/i);
    }
  });

  it("trims, drops blank, and de-dupes tags", () => {
    expect(
      updateItemSchema.parse({
        ...base,
        tags: [" react ", "react", "", "  ", "hooks"],
      }).tags,
    ).toEqual(["react", "hooks"]);
  });

  it("defaults missing optional fields", () => {
    const parsed = updateItemSchema.parse({ title: "Only a title" });
    expect(parsed).toMatchObject({
      title: "Only a title",
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
    });
  });
});
