import { afterEach, describe, expect, it, vi } from "vitest";

import { postJson } from "@/lib/post-json";

afterEach(() => vi.unstubAllGlobals());

function stubFetch(impl: typeof fetch) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

describe("postJson", () => {
  it("sends a JSON POST and returns ok + parsed body on success", async () => {
    stubFetch(
      async () =>
        new Response(JSON.stringify({ id: "1" }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
    );

    const result = await postJson<{ id: string }>("/api/x", { a: 1 });
    expect(result).toEqual({ ok: true, status: 201, data: { id: "1" } });

    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(url).toBe("/api/x");
    expect(init).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ a: 1 }),
    });
  });

  it("uses the method argument when one is given (PATCH / DELETE)", async () => {
    stubFetch(async () => new Response(JSON.stringify({ ok: 1 }), { status: 200 }));

    await postJson("/api/x/1", { name: "y" }, "PATCH");

    const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init).toMatchObject({ method: "PATCH" });
  });

  it("returns ok:false with the parsed error body on a non-2xx response", async () => {
    stubFetch(
      async () =>
        new Response(JSON.stringify({ error: "nope" }), { status: 409 }),
    );
    const result = await postJson<{ error: string }>("/api/x", {});
    expect(result).toEqual({ ok: false, status: 409, data: { error: "nope" } });
  });

  it("returns status 0 when fetch throws (network failure)", async () => {
    stubFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(await postJson("/api/x", {})).toEqual({
      ok: false,
      status: 0,
      data: null,
    });
  });

  it("returns data:null when the response body is not JSON", async () => {
    stubFetch(async () => new Response("<html>", { status: 500 }));
    expect(await postJson("/api/x", {})).toEqual({
      ok: false,
      status: 500,
      data: null,
    });
  });
});
