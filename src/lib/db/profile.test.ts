import { beforeEach, describe, expect, it, vi } from "vitest";

// `@/auth` pulls in the full NextAuth instance; `@/lib/prisma` hits a real DB;
// `next/navigation`'s `redirect` throws a framework-internal error. Mock all
// three so `requireProfileUser` can be exercised in isolation.
const auth = vi.fn();
vi.mock("@/auth", () => ({ auth }));

const user = { findUnique: vi.fn() };
vi.mock("@/lib/prisma", () => ({ prisma: { user } }));

const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({ redirect }));

const { requireProfileUser } = await import("@/lib/db/profile");

const dbUser = {
  id: "user_1",
  name: "Demo User",
  email: "demo@devstash.io",
  image: null,
  emailVerified: new Date("2026-01-01"),
  isPro: false,
  password: "hashed",
  createdAt: new Date("2026-01-01"),
};

beforeEach(() => {
  auth.mockReset();
  user.findUnique.mockReset();
  redirect.mockClear();
});

describe("requireProfileUser", () => {
  it("redirects to sign-in (encoded callbackUrl) when there is no session", async () => {
    auth.mockResolvedValue(null);

    await expect(requireProfileUser("/settings")).rejects.toThrow(
      "REDIRECT:/sign-in?callbackUrl=%2Fsettings",
    );
    expect(user.findUnique).not.toHaveBeenCalled();
  });

  it("redirects when the session user row no longer exists", async () => {
    auth.mockResolvedValue({ user: { id: "user_1" } });
    user.findUnique.mockResolvedValue(null);

    await expect(requireProfileUser("/profile")).rejects.toThrow(
      "REDIRECT:/sign-in?callbackUrl=%2Fprofile",
    );
  });

  it("returns the profile user (with hasPassword derived) and does not redirect", async () => {
    auth.mockResolvedValue({ user: { id: "user_1" } });
    user.findUnique.mockResolvedValue(dbUser);

    const result = await requireProfileUser("/settings");

    expect(result).toEqual({
      id: "user_1",
      name: "Demo User",
      email: "demo@devstash.io",
      image: null,
      emailVerified: dbUser.emailVerified,
      isPro: false,
      hasPassword: true,
      createdAt: dbUser.createdAt,
    });
    expect(result).not.toHaveProperty("password");
    expect(redirect).not.toHaveBeenCalled();
  });
});
