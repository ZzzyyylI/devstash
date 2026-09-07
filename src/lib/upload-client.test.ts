import { afterEach, describe, expect, it, vi } from "vitest";

import { uploadFile } from "@/lib/upload-client";

/** Minimal XMLHttpRequest stand-in — the test drives `onload` / `onerror`. */
class FakeXHR {
  static last: FakeXHR | null = null;

  upload: { onprogress: ((e: ProgressEvent) => void) | null } = {
    onprogress: null,
  };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  status = 0;
  responseText = "";
  aborted = false;

  constructor() {
    FakeXHR.last = this;
  }
  open() {}
  send() {}
  abort() {
    this.aborted = true;
    this.onabort?.();
  }

  finish(status: number, body: unknown) {
    this.status = status;
    this.responseText =
      typeof body === "string" ? body : JSON.stringify(body);
    this.onload?.();
  }
}

function useFakeXHR() {
  vi.stubGlobal("XMLHttpRequest", FakeXHR as unknown as typeof XMLHttpRequest);
}

afterEach(() => vi.unstubAllGlobals());

const file = new File(["data"], "shot.png", { type: "image/png" });

describe("uploadFile", () => {
  it("resolves with the mapped object ref on a 2xx + data payload", async () => {
    useFakeXHR();
    const promise = uploadFile("image", file);
    FakeXHR.last!.finish(201, {
      success: true,
      data: { key: "uploads/u/image/x.png", fileName: "shot.png", fileSize: 4 },
    });
    await expect(promise).resolves.toEqual({
      key: "uploads/u/image/x.png",
      name: "shot.png",
      size: 4,
    });
  });

  it("rejects with the server's error message on a non-2xx response", async () => {
    useFakeXHR();
    const promise = uploadFile("file", file);
    FakeXHR.last!.finish(429, { success: false, error: "Too many uploads." });
    await expect(promise).rejects.toThrow("Too many uploads.");
  });

  it("rejects with a generic message when the body is not JSON", async () => {
    useFakeXHR();
    const promise = uploadFile("file", file);
    FakeXHR.last!.finish(500, "<html>oops</html>");
    await expect(promise).rejects.toThrow("Upload failed. Try again.");
  });

  it("rejects on a network error", async () => {
    useFakeXHR();
    const promise = uploadFile("file", file);
    FakeXHR.last!.onerror?.();
    await expect(promise).rejects.toThrow(/connection/i);
  });

  it("rejects with an AbortError when the signal is already aborted", async () => {
    useFakeXHR();
    await expect(
      uploadFile("file", file, { signal: AbortSignal.abort() }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("reports progress as a 0–100 integer", async () => {
    useFakeXHR();
    const onProgress = vi.fn();
    void uploadFile("image", file, { onProgress });
    FakeXHR.last!.upload.onprogress?.({
      lengthComputable: true,
      loaded: 30,
      total: 120,
    } as ProgressEvent);
    expect(onProgress).toHaveBeenCalledWith(25);
  });
});
