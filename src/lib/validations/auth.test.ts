import { describe, expect, it } from "vitest";

import {
  changePasswordSchema,
  registerSchema,
  resetPasswordSchema,
  signInSchema,
} from "@/lib/validations/auth";

describe("signInSchema", () => {
  it("accepts a valid email + password", () => {
    const result = signInSchema.safeParse({
      email: "user@example.com",
      password: "hunter2",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed email", () => {
    expect(signInSchema.safeParse({ email: "nope", password: "x" }).success).toBe(
      false,
    );
  });

  it("rejects an empty password", () => {
    expect(
      signInSchema.safeParse({ email: "user@example.com", password: "" }).success,
    ).toBe(false);
  });
});

describe("registerSchema", () => {
  const base = {
    name: "Ada Lovelace",
    email: "Ada@Example.com",
    password: "supersecret",
    confirmPassword: "supersecret",
  };

  it("lowercases the email and trims the name", () => {
    const result = registerSchema.safeParse({ ...base, name: "  Ada  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("ada@example.com");
      expect(result.data.name).toBe("Ada");
    }
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = registerSchema.safeParse({
      ...base,
      password: "short",
      confirmPassword: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched confirmPassword on the confirmPassword path", () => {
    const result = registerSchema.safeParse({
      ...base,
      confirmPassword: "different",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["confirmPassword"]);
    }
  });
});

describe("resetPasswordSchema", () => {
  it("requires a non-empty token", () => {
    const result = resetPasswordSchema.safeParse({
      token: "",
      password: "supersecret",
      confirmPassword: "supersecret",
    });
    expect(result.success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("rejects a new password equal to the current one", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "samepassword",
      newPassword: "samepassword",
      confirmPassword: "samepassword",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "newPassword")).toBe(
        true,
      );
    }
  });

  it("accepts a valid change", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "oldpassword",
      newPassword: "brandnewpassword",
      confirmPassword: "brandnewpassword",
    });
    expect(result.success).toBe(true);
  });
});
