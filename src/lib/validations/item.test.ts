import { describe, expect, it } from "vitest";

import {
  createItemSchema,
  isCodeItemType,
  isFileItemType,
  isMarkdownItemType,
  updateItemSchema,
} from "@/lib/validations/item";

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

  it("accepts http and https URLs", () => {
    expect(
      updateItemSchema.parse({ ...base, url: "http://localhost:3000/x" }).url,
    ).toBe("http://localhost:3000/x");
    expect(
      updateItemSchema.parse({ ...base, url: "https://example.com" }).url,
    ).toBe("https://example.com");
  });

  it("rejects non-http(s) URL schemes", () => {
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
    ]) {
      const result = updateItemSchema.safeParse({ ...base, url });
      expect(result.success, url).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.url?.[0]).toMatch(
          /http or https/i,
        );
      }
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

  it("trims, drops blank, and de-dupes collectionIds", () => {
    expect(
      updateItemSchema.parse({
        ...base,
        collectionIds: [" col_1 ", "col_1", "", "  ", "col_2"],
      }).collectionIds,
    ).toEqual(["col_1", "col_2"]);
  });

  it("defaults a missing / null collectionIds to an empty array", () => {
    expect(updateItemSchema.parse({ ...base }).collectionIds).toEqual([]);
    expect(
      updateItemSchema.parse({ ...base, collectionIds: null }).collectionIds,
    ).toEqual([]);
  });

  it("rejects a non-array collectionIds", () => {
    const result = updateItemSchema.safeParse({
      ...base,
      collectionIds: "col_1",
    });
    expect(result.success).toBe(false);
  });

  it("caps collectionIds at 100", () => {
    const ids = Array.from({ length: 101 }, (_, i) => `col_${i}`);
    const result = updateItemSchema.safeParse({ ...base, collectionIds: ids });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.collectionIds?.[0]).toMatch(
        /max 100/i,
      );
    }
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
      collectionIds: [],
    });
  });
});

describe("createItemSchema", () => {
  const createBase = { ...base, type: "snippet" as const };

  it("normalises the shared fields like updateItemSchema", () => {
    const parsed = createItemSchema.parse({
      ...createBase,
      title: "  Hello  ",
      tags: [" react ", "react"],
    });
    expect(parsed).toMatchObject({ title: "Hello", tags: ["react"] });
  });

  it("requires a valid type", () => {
    const result = createItemSchema.safeParse({ ...createBase, type: "widget" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.type?.length).toBeGreaterThan(0);
    }
  });

  it("requires a URL when the type is link", () => {
    const result = createItemSchema.safeParse({
      ...createBase,
      type: "link",
      url: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.url?.[0]).toMatch(/valid URL/i);
    }
  });

  it("accepts a link that carries a URL", () => {
    const parsed = createItemSchema.parse({
      ...createBase,
      type: "link",
      url: "https://example.com",
    });
    expect(parsed.url).toBe("https://example.com");
  });

  it("does not require a URL for non-link types", () => {
    expect(
      createItemSchema.parse({ ...createBase, type: "note", url: "" }).url,
    ).toBeNull();
  });

  it("requires an uploaded key for file / image types", () => {
    for (const type of ["file", "image"] as const) {
      const result = createItemSchema.safeParse({ ...base, type });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.fileKey?.[0]).toMatch(
          /upload a file/i,
        );
      }
    }
  });

  it("accepts a file item that carries an upload", () => {
    const parsed = createItemSchema.parse({
      ...base,
      type: "image",
      fileKey: "uploads/user_1/image/abc.png",
      fileName: "abc.png",
      fileSize: 2048,
    });
    expect(parsed).toMatchObject({
      type: "image",
      fileKey: "uploads/user_1/image/abc.png",
      fileName: "abc.png",
      fileSize: 2048,
    });
  });

  it("leaves file fields undefined for a text item", () => {
    const parsed = createItemSchema.parse({ ...createBase });
    expect(parsed.fileKey).toBeUndefined();
    expect(parsed.fileSize).toBeUndefined();
  });
});

describe("isFileItemType", () => {
  it("is true for file / image, case- and whitespace-insensitively", () => {
    expect(isFileItemType("file")).toBe(true);
    expect(isFileItemType("image")).toBe(true);
    expect(isFileItemType("  Image ")).toBe(true);
    expect(isFileItemType("FILE")).toBe(true);
  });

  it("is false for the text types", () => {
    expect(isFileItemType("snippet")).toBe(false);
    expect(isFileItemType("link")).toBe(false);
    expect(isFileItemType("")).toBe(false);
  });
});

describe("isCodeItemType", () => {
  it("is true for the code types, case- and whitespace-insensitively", () => {
    expect(isCodeItemType("snippet")).toBe(true);
    expect(isCodeItemType("command")).toBe(true);
    expect(isCodeItemType("  Snippet ")).toBe(true);
    expect(isCodeItemType("COMMAND")).toBe(true);
  });

  it("is false for non-code types", () => {
    expect(isCodeItemType("note")).toBe(false);
    expect(isCodeItemType("prompt")).toBe(false);
    expect(isCodeItemType("link")).toBe(false);
    expect(isCodeItemType("")).toBe(false);
  });
});

describe("isMarkdownItemType", () => {
  it("is true for the prose types, case- and whitespace-insensitively", () => {
    expect(isMarkdownItemType("prompt")).toBe(true);
    expect(isMarkdownItemType("note")).toBe(true);
    expect(isMarkdownItemType("  Prompt ")).toBe(true);
    expect(isMarkdownItemType("NOTE")).toBe(true);
  });

  it("is false for non-prose types", () => {
    expect(isMarkdownItemType("snippet")).toBe(false);
    expect(isMarkdownItemType("command")).toBe(false);
    expect(isMarkdownItemType("link")).toBe(false);
    expect(isMarkdownItemType("")).toBe(false);
  });
});
