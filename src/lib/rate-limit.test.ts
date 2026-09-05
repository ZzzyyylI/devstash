import { describe, expect, it } from "vitest";

import { getClientIp } from "@/lib/rate-limit";

function req(headers: Record<string, string>): Request {
  return new Request("http://internal/api/auth/login", { headers });
}

describe("getClientIp", () => {
  it("takes the first entry of x-forwarded-for", () => {
    expect(
      getClientIp(req({ "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178" })),
    ).toBe("203.0.113.7");
  });

  it("trims whitespace around the forwarded IP", () => {
    expect(getClientIp(req({ "x-forwarded-for": "  198.51.100.2  " }))).toBe(
      "198.51.100.2",
    );
  });

  it("falls back to x-real-ip", () => {
    expect(getClientIp(req({ "x-real-ip": "192.0.2.44" }))).toBe("192.0.2.44");
  });

  it("falls back to a constant when no IP header is present", () => {
    expect(getClientIp(req({}))).toBe("127.0.0.1");
  });
});
