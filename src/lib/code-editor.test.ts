import { describe, expect, it } from "vitest";

import { toMonacoLanguage } from "@/lib/code-editor";

describe("toMonacoLanguage", () => {
  it("returns 'plaintext' for blank / nullish input", () => {
    expect(toMonacoLanguage(null)).toBe("plaintext");
    expect(toMonacoLanguage(undefined)).toBe("plaintext");
    expect(toMonacoLanguage("")).toBe("plaintext");
    expect(toMonacoLanguage("   ")).toBe("plaintext");
  });

  it("resolves known aliases, case- and whitespace-insensitively", () => {
    expect(toMonacoLanguage("ts")).toBe("typescript");
    expect(toMonacoLanguage("  JS ")).toBe("javascript");
    expect(toMonacoLanguage("Bash")).toBe("shell");
    expect(toMonacoLanguage("yml")).toBe("yaml");
    expect(toMonacoLanguage("c#")).toBe("csharp");
  });

  it("passes an unknown language through, lower-cased", () => {
    expect(toMonacoLanguage("typescript")).toBe("typescript");
    expect(toMonacoLanguage("PYTHON")).toBe("python");
    expect(toMonacoLanguage("some-unknown-lang")).toBe("some-unknown-lang");
  });
});
