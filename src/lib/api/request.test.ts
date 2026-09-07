import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  INVALID_JSON,
  invalidJsonResponse,
  readJsonBody,
  validationErrorResponse,
} from "@/lib/api/request";

describe("readJsonBody", () => {
  it("parses a valid JSON body", async () => {
    const req = new Request("http://x/y", {
      method: "POST",
      body: JSON.stringify({ a: 1 }),
    });
    expect(await readJsonBody(req)).toEqual({ a: 1 });
  });

  it("returns INVALID_JSON for a malformed body", async () => {
    const req = new Request("http://x/y", { method: "POST", body: "{oops" });
    expect(await readJsonBody(req)).toBe(INVALID_JSON);
  });

  it("returns INVALID_JSON for an empty body", async () => {
    const req = new Request("http://x/y", { method: "POST" });
    expect(await readJsonBody(req)).toBe(INVALID_JSON);
  });
});

describe("invalidJsonResponse", () => {
  it("is a 400 with the standard shape", async () => {
    const res = invalidJsonResponse();
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      success: false,
      error: "Invalid JSON body",
    });
  });
});

describe("validationErrorResponse", () => {
  const schema = z.object({ email: z.email("Enter a valid email") });
  const err = (() => {
    const r = schema.safeParse({ email: "nope" });
    if (r.success) throw new Error("expected failure");
    return r.error;
  })();

  it("includes flattened field errors by default", async () => {
    const res = validationErrorResponse(err, "Bad input");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      success: false,
      error: "Bad input",
      details: { email: ["Enter a valid email"] },
    });
  });

  it("omits details when includeDetails is false", async () => {
    const res = validationErrorResponse(err, "Bad input", false);
    expect(await res.json()).toEqual({ success: false, error: "Bad input" });
  });
});
