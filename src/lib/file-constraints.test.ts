import { describe, expect, it } from "vitest";

import {
  acceptAttr,
  extensionOf,
  formatBytes,
  validateUpload,
} from "@/lib/file-constraints";

describe("extensionOf", () => {
  it("returns the lower-case extension with its dot", () => {
    expect(extensionOf("photo.PNG")).toBe(".png");
    expect(extensionOf("archive.tar.gz")).toBe(".gz");
  });

  it("returns '' when there is no usable extension", () => {
    expect(extensionOf("README")).toBe("");
    expect(extensionOf(".gitignore")).toBe("");
    expect(extensionOf("trailing.")).toBe("");
  });
});

describe("formatBytes", () => {
  it("scales into B / KB / MB", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("handles missing / bogus input", () => {
    expect(formatBytes(null)).toBe("—");
    expect(formatBytes(-1)).toBe("—");
  });
});

describe("acceptAttr", () => {
  it("is a comma-joined extension list", () => {
    expect(acceptAttr("image")).toBe(".png,.jpg,.jpeg,.gif,.webp,.svg");
    expect(acceptAttr("file")).toContain(".pdf");
  });
});

describe("validateUpload", () => {
  it("accepts a well-formed image", () => {
    const result = validateUpload("image", {
      name: "diagram.png",
      size: 1024,
      type: "image/png",
    });
    expect(result).toEqual({ ok: true, extension: ".png" });
  });

  it("accepts a file whose browser MIME type is blank", () => {
    expect(
      validateUpload("file", { name: "notes.md", size: 10, type: "" }).ok,
    ).toBe(true);
  });

  it("accepts any text/* MIME for a text-ish file extension", () => {
    expect(
      validateUpload("file", {
        name: "data.csv",
        size: 10,
        type: "text/anything",
      }).ok,
    ).toBe(true);
  });

  it("rejects an extension outside the kind's allow-list", () => {
    const result = validateUpload("image", {
      name: "malware.exe",
      size: 10,
      type: "application/octet-stream",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/unsupported/i);
  });

  it("rejects a document uploaded as an image", () => {
    expect(
      validateUpload("image", { name: "report.pdf", size: 10, type: "application/pdf" })
        .ok,
    ).toBe(false);
  });

  it("rejects an oversized image (> 5 MB)", () => {
    const result = validateUpload("image", {
      name: "huge.jpg",
      size: 6 * 1024 * 1024,
      type: "image/jpeg",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/under 5\.0 MB/i);
  });

  it("rejects an oversized file (> 10 MB)", () => {
    expect(
      validateUpload("file", {
        name: "big.pdf",
        size: 11 * 1024 * 1024,
        type: "application/pdf",
      }).ok,
    ).toBe(false);
  });

  it("rejects an empty file", () => {
    expect(
      validateUpload("file", { name: "empty.txt", size: 0, type: "text/plain" }).ok,
    ).toBe(false);
  });

  it("rejects a clearly wrong MIME family", () => {
    const result = validateUpload("file", {
      name: "notes.txt",
      size: 10,
      type: "image/png",
    });
    expect(result.ok).toBe(false);
  });
});
