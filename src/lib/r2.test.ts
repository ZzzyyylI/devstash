import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Only the S3 SDK is mocked — `@/lib/r2`'s own logic runs for real.
const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn(function S3Client() {
    return { send };
  }),
  PutObjectCommand: vi.fn(function PutObjectCommand(input: unknown) {
    return { __cmd: "put", input };
  }),
  GetObjectCommand: vi.fn(function GetObjectCommand(input: unknown) {
    return { __cmd: "get", input };
  }),
  DeleteObjectCommand: vi.fn(function DeleteObjectCommand(input: unknown) {
    return { __cmd: "delete", input };
  }),
}));

import {
  buildObjectKey,
  deleteObject,
  getObject,
  isR2Configured,
  putObject,
  toObjectKey,
} from "@/lib/r2";

const R2_VARS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
] as const;

function setAllR2() {
  for (const name of R2_VARS) vi.stubEnv(name, `test-${name}`);
}

beforeEach(() => {
  send.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isR2Configured", () => {
  it("is true only when every R2 var is set", () => {
    setAllR2();
    expect(isR2Configured()).toBe(true);
  });

  it("is false when any R2 var is missing", () => {
    setAllR2();
    vi.stubEnv("R2_BUCKET_NAME", undefined);
    expect(isR2Configured()).toBe(false);
  });

  it("is false with no R2 config at all", () => {
    for (const name of R2_VARS) vi.stubEnv(name, undefined);
    expect(isR2Configured()).toBe(false);
  });
});

describe("toObjectKey", () => {
  it("leaves a bare key untouched", () => {
    expect(toObjectKey("uploads/u/file/x.txt")).toBe("uploads/u/file/x.txt");
  });

  it("trims whitespace and a leading slash", () => {
    expect(toObjectKey("  /uploads/u/file/x.txt ")).toBe(
      "uploads/u/file/x.txt",
    );
  });

  it("reduces a public bucket URL to its path", () => {
    expect(
      toObjectKey("https://files.example.com/uploads/u/image/x.png"),
    ).toBe("uploads/u/image/x.png");
  });

  it("strips the origin and a leading <bucket>/ from the S3 endpoint form", () => {
    vi.stubEnv("R2_BUCKET_NAME", "my-bucket");
    expect(
      toObjectKey(
        "https://acct.r2.cloudflarestorage.com/my-bucket/uploads/u/file/x.pdf",
      ),
    ).toBe("uploads/u/file/x.pdf");
  });

  it("decodes percent-encoded path segments", () => {
    expect(
      toObjectKey("https://files.example.com/uploads/u/file/my%20doc.pdf"),
    ).toBe("uploads/u/file/my doc.pdf");
  });
});

describe("buildObjectKey", () => {
  it("namespaces by user + kind and keeps the extension", () => {
    const key = buildObjectKey("user_1", "image", ".png");
    expect(key).toMatch(/^uploads\/user_1\/image\/[0-9a-f-]{36}\.png$/);
  });

  it("produces a fresh key each call", () => {
    expect(buildObjectKey("u", "file", ".pdf")).not.toBe(
      buildObjectKey("u", "file", ".pdf"),
    );
  });
});

describe("putObject", () => {
  it("sends a PutObjectCommand carrying the bucket, key, body and content type", async () => {
    setAllR2();
    send.mockResolvedValue({});
    const body = Buffer.from("hello");

    await putObject("uploads/u/file/x.txt", body, "text/plain");

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].input).toEqual({
      Bucket: "test-R2_BUCKET_NAME",
      Key: "uploads/u/file/x.txt",
      Body: body,
      ContentType: "text/plain",
    });
  });

  it("rejects when R2 isn't configured", async () => {
    await expect(
      putObject("k", Buffer.from(""), "text/plain"),
    ).rejects.toThrow(/not configured/i);
    expect(send).not.toHaveBeenCalled();
  });
});

describe("getObject", () => {
  it("maps the SDK response to a web stream + metadata", async () => {
    setAllR2();
    const stream = new ReadableStream<Uint8Array>();
    send.mockResolvedValue({
      Body: { transformToWebStream: () => stream },
      ContentType: "image/png",
      ContentLength: 42,
    });

    const result = await getObject("uploads/u/image/x.png");

    expect(result).toEqual({
      body: stream,
      contentType: "image/png",
      contentLength: 42,
    });
  });

  it("falls back to octet-stream / null when the response omits metadata", async () => {
    setAllR2();
    send.mockResolvedValue({ Body: { transformToWebStream: () => "s" } });

    const result = await getObject("k");

    expect(result.contentType).toBe("application/octet-stream");
    expect(result.contentLength).toBeNull();
  });

  it("throws when the object has no body", async () => {
    setAllR2();
    send.mockResolvedValue({});

    await expect(getObject("k")).rejects.toThrow(/no body/i);
  });
});

describe("deleteObject", () => {
  it("sends a DeleteObjectCommand for the key", async () => {
    setAllR2();
    send.mockResolvedValue({});

    await deleteObject("uploads/u/file/x.txt");

    expect(send.mock.calls[0][0].input).toEqual({
      Bucket: "test-R2_BUCKET_NAME",
      Key: "uploads/u/file/x.txt",
    });
  });

  it("swallows a storage failure instead of throwing (best-effort contract)", async () => {
    setAllR2();
    send.mockRejectedValue(new Error("R2 exploded"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(deleteObject("k")).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("swallows a missing-config error too", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(deleteObject("k")).resolves.toBeUndefined();

    expect(send).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
