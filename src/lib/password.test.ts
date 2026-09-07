import { describe, expect, it } from "vitest";

import { BCRYPT_ROUNDS, hashPassword, verifyPassword } from "@/lib/password";

describe("password", () => {
  it("uses a cost factor of 12", () => {
    expect(BCRYPT_ROUNDS).toBe(12);
  });

  it("produces a bcrypt hash that encodes the cost factor", async () => {
    const hash = await hashPassword("correct horse battery staple");
    // bcrypt hash format: $2<a|b|y>$<rounds>$<salt+digest>
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
  });

  it("verifyPassword round-trips a hashPassword output", async () => {
    const hash = await hashPassword("s3cret-passphrase");
    await expect(verifyPassword("s3cret-passphrase", hash)).resolves.toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("the-real-one");
    await expect(verifyPassword("not-it", hash)).resolves.toBe(false);
  });
});
