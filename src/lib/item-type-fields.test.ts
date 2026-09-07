import { describe, expect, it } from "vitest";

import { itemTypeFields } from "@/lib/item-type-fields";

describe("itemTypeFields", () => {
  it("snippet: content + language + code editor", () => {
    expect(itemTypeFields("snippet")).toEqual({
      showContent: true,
      showLanguage: true,
      showUrl: false,
      showFileUpload: false,
      showCodeEditor: true,
      showMarkdownEditor: false,
    });
  });

  it("command: content + language + code editor (like snippet)", () => {
    const f = itemTypeFields("command");
    expect(f.showContent).toBe(true);
    expect(f.showLanguage).toBe(true);
    expect(f.showCodeEditor).toBe(true);
    expect(f.showMarkdownEditor).toBe(false);
  });

  it("prompt / note: content + markdown editor, no language", () => {
    for (const name of ["prompt", "note"]) {
      const f = itemTypeFields(name);
      expect(f.showContent, name).toBe(true);
      expect(f.showLanguage, name).toBe(false);
      expect(f.showMarkdownEditor, name).toBe(true);
      expect(f.showCodeEditor, name).toBe(false);
    }
  });

  it("link: url only", () => {
    const f = itemTypeFields("link");
    expect(f.showUrl).toBe(true);
    expect(f.showContent).toBe(false);
    expect(f.showFileUpload).toBe(false);
  });

  it("file / image: file upload only", () => {
    for (const name of ["file", "image"]) {
      const f = itemTypeFields(name);
      expect(f.showFileUpload, name).toBe(true);
      expect(f.showContent, name).toBe(false);
      expect(f.showUrl, name).toBe(false);
    }
  });

  it("is case- and whitespace-insensitive", () => {
    expect(itemTypeFields("  SNIPPET ")).toEqual(itemTypeFields("snippet"));
  });

  it("unknown type: everything false", () => {
    expect(itemTypeFields("widget")).toEqual({
      showContent: false,
      showLanguage: false,
      showUrl: false,
      showFileUpload: false,
      showCodeEditor: false,
      showMarkdownEditor: false,
    });
  });
});
