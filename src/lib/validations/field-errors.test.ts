import { describe, expect, it } from "vitest";
import { z } from "zod";

import { collectFieldErrors } from "@/lib/validations/field-errors";

const schema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "Too short"),
});

function errorFor(input: unknown) {
  const parsed = schema.safeParse(input);
  if (parsed.success) throw new Error("expected a parse failure");
  return parsed.error;
}

describe("collectFieldErrors", () => {
  it("maps the first issue per field by its top path segment", () => {
    const out = collectFieldErrors(errorFor({ email: "nope", password: "x" }));
    expect(out).toEqual({ email: "Enter a valid email", password: "Too short" });
  });

  it("keeps only the first message when a field has several issues", () => {
    const multi = z.object({
      password: z.string().min(8, "Too short").regex(/\d/, "Needs a digit"),
    });
    const parsed = multi.safeParse({ password: "abc" });
    if (parsed.success) throw new Error("expected failure");
    expect(collectFieldErrors(parsed.error)).toEqual({ password: "Too short" });
  });

  it("drops issues whose key is not in `allowed`", () => {
    const out = collectFieldErrors(
      errorFor({ email: "nope", password: "x" }),
      ["password"],
    );
    expect(out).toEqual({ password: "Too short" });
  });

  it("returns an empty object when there is nothing to report", () => {
    const parsed = schema.safeParse({
      email: "a@b.com",
      password: "longenough",
    });
    expect(parsed.success).toBe(true);
  });
});
