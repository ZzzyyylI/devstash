import { beforeEach, describe, expect, it, vi } from "vitest";

// `@/auth` pulls in the Prisma adapter and the whole NextAuth instance; mock it
// so the server action can be tested in isolation.
const signIn = vi.fn();
vi.mock("@/auth", () => ({ signIn }));

const { signInWithGitHub } = await import("@/actions/auth");

beforeEach(() => {
  signIn.mockReset();
});

describe("signInWithGitHub", () => {
  it("delegates to Auth.js signIn with the github provider and redirect target", async () => {
    await signInWithGitHub("/dashboard");
    expect(signIn).toHaveBeenCalledWith("github", { redirectTo: "/dashboard" });
  });

  it("passes the caller-supplied redirect target through unchanged", async () => {
    await signInWithGitHub("/items/snippet");
    expect(signIn).toHaveBeenCalledWith("github", {
      redirectTo: "/items/snippet",
    });
  });
});
