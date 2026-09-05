import { afterEach, describe, expect, it, vi } from "vitest";

import { emailVerificationEnabled } from "@/lib/auth-flags";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("emailVerificationEnabled", () => {
  it("defaults to enabled when the env var is unset", () => {
    vi.stubEnv("EMAIL_VERIFICATION_ENABLED", undefined);
    expect(emailVerificationEnabled()).toBe(true);
  });

  it('is disabled only for the literal "false" (case-insensitive)', () => {
    vi.stubEnv("EMAIL_VERIFICATION_ENABLED", "false");
    expect(emailVerificationEnabled()).toBe(false);

    vi.stubEnv("EMAIL_VERIFICATION_ENABLED", "FALSE");
    expect(emailVerificationEnabled()).toBe(false);
  });

  it("stays enabled for any other value", () => {
    vi.stubEnv("EMAIL_VERIFICATION_ENABLED", "true");
    expect(emailVerificationEnabled()).toBe(true);

    vi.stubEnv("EMAIL_VERIFICATION_ENABLED", "0");
    expect(emailVerificationEnabled()).toBe(true);
  });
});
