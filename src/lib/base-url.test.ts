import { afterEach, describe, expect, it, vi } from "vitest";

import { getBaseUrl } from "@/lib/base-url";

/** Build a bare Request carrying only the given headers. */
function requestWithHeaders(headers: Record<string, string>): Request {
  return new Request("http://internal/api/auth/register", { headers });
}

/** Clear both origin env vars unless a test opts one back in. */
function clearOriginEnv() {
  vi.stubEnv("AUTH_URL", undefined);
  vi.stubEnv("NEXT_PUBLIC_APP_URL", undefined);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getBaseUrl", () => {
  it("prefers AUTH_URL and strips a trailing slash", () => {
    clearOriginEnv();
    vi.stubEnv("AUTH_URL", "https://devstash.app/");
    expect(getBaseUrl(requestWithHeaders({ host: "spoofed.example" }))).toBe(
      "https://devstash.app",
    );
  });

  it("falls back to NEXT_PUBLIC_APP_URL when AUTH_URL is unset", () => {
    clearOriginEnv();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://staging.devstash.app");
    expect(getBaseUrl(requestWithHeaders({}))).toBe("https://staging.devstash.app");
  });

  it("derives https origin from the forwarded host when nothing is configured", () => {
    clearOriginEnv();
    expect(
      getBaseUrl(
        requestWithHeaders({ "x-forwarded-host": "devstash.vercel.app" }),
      ),
    ).toBe("https://devstash.vercel.app");
  });

  it("uses http for a localhost host", () => {
    clearOriginEnv();
    expect(getBaseUrl(requestWithHeaders({ host: "localhost:3000" }))).toBe(
      "http://localhost:3000",
    );
  });

  it("respects an explicit x-forwarded-proto", () => {
    clearOriginEnv();
    expect(
      getBaseUrl(
        requestWithHeaders({
          host: "devstash.app",
          "x-forwarded-proto": "http",
        }),
      ),
    ).toBe("http://devstash.app");
  });

  it("last-resorts to http://localhost:3000 with no host header", () => {
    clearOriginEnv();
    expect(getBaseUrl(requestWithHeaders({}))).toBe("http://localhost:3000");
  });
});
