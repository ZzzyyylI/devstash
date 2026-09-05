import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Replace the Prisma singleton so these tests never touch a real database.
// This is the pattern for unit-testing any util or server action that reads or
// writes through `@/lib/prisma`.
const verificationToken = {
  findFirst: vi.fn(),
  create: vi.fn(),
  deleteMany: vi.fn(),
};

vi.mock("@/lib/prisma", () => ({
  prisma: { verificationToken },
}));

const {
  consumeVerificationToken,
  consumePasswordResetToken,
  createPasswordResetToken,
} = await import("@/lib/tokens");

beforeEach(() => {
  verificationToken.findFirst.mockReset();
  verificationToken.create.mockReset();
  verificationToken.deleteMany.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("consumeVerificationToken", () => {
  it("returns null and still deletes the row for an expired token", async () => {
    verificationToken.findFirst.mockResolvedValue({
      identifier: "user@example.com",
      token: "abc",
      expires: new Date(Date.now() - 1000),
    });

    const result = await consumeVerificationToken("abc");

    expect(result).toBeNull();
    expect(verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { identifier: "user@example.com", token: "abc" },
    });
  });

  it("returns the identifier for a live token", async () => {
    verificationToken.findFirst.mockResolvedValue({
      identifier: "user@example.com",
      token: "abc",
      expires: new Date(Date.now() + 60_000),
    });

    expect(await consumeVerificationToken("abc")).toEqual({
      identifier: "user@example.com",
    });
  });

  it("returns null for an unknown token", async () => {
    verificationToken.findFirst.mockResolvedValue(null);
    expect(await consumeVerificationToken("nope")).toBeNull();
    expect(verificationToken.deleteMany).not.toHaveBeenCalled();
  });
});

describe("password-reset token namespacing", () => {
  it("createPasswordResetToken mints under the pwreset: identifier", async () => {
    verificationToken.deleteMany.mockResolvedValue({ count: 0 });
    verificationToken.create.mockResolvedValue({});

    await createPasswordResetToken("user@example.com");

    expect(verificationToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ identifier: "pwreset:user@example.com" }),
    });
  });

  it("consumePasswordResetToken rejects a plain verification token", async () => {
    verificationToken.findFirst.mockResolvedValue({
      identifier: "user@example.com", // no pwreset: prefix
      token: "abc",
      expires: new Date(Date.now() + 60_000),
    });

    expect(await consumePasswordResetToken("abc")).toBeNull();
  });

  it("consumePasswordResetToken strips the prefix and returns the bare email", async () => {
    verificationToken.findFirst.mockResolvedValue({
      identifier: "pwreset:user@example.com",
      token: "abc",
      expires: new Date(Date.now() + 60_000),
    });

    expect(await consumePasswordResetToken("abc")).toEqual({
      email: "user@example.com",
    });
  });
});
