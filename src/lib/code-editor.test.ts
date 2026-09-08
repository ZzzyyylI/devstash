import { describe, expect, it } from "vitest";

import {
  CODE_LANGUAGE_OPTIONS,
  codeLanguageSelectValue,
  isKnownCodeLanguage,
  toMonacoLanguage,
} from "@/lib/code-editor";

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

describe("CODE_LANGUAGE_OPTIONS", () => {
  it("leads with a blank 'Plain text' option", () => {
    expect(CODE_LANGUAGE_OPTIONS[0]).toEqual({ value: "", label: "Plain text" });
  });

  it("has unique, lower-cased, non-empty values after the first", () => {
    const values = CODE_LANGUAGE_OPTIONS.slice(1).map((option) => option.value);
    expect(values.every((value) => value === value.toLowerCase())).toBe(true);
    expect(values.every((value) => value.length > 0)).toBe(true);
    expect(new Set(values).size).toBe(values.length);
  });

  it("uses canonical Monaco ids — every value maps through toMonacoLanguage to itself", () => {
    for (const { value } of CODE_LANGUAGE_OPTIONS.slice(1)) {
      expect(toMonacoLanguage(value)).toBe(value);
    }
  });
});

describe("isKnownCodeLanguage", () => {
  it("is true for a dropdown value (including the blank one) and false otherwise", () => {
    expect(isKnownCodeLanguage("")).toBe(true);
    expect(isKnownCodeLanguage("typescript")).toBe(true);
    expect(isKnownCodeLanguage("shell")).toBe(true);
    expect(isKnownCodeLanguage("bash")).toBe(false);
    expect(isKnownCodeLanguage("cobol")).toBe(false);
  });
});

describe("codeLanguageSelectValue", () => {
  it("returns '' for blank / nullish input", () => {
    expect(codeLanguageSelectValue(null)).toBe("");
    expect(codeLanguageSelectValue(undefined)).toBe("");
    expect(codeLanguageSelectValue("   ")).toBe("");
  });

  it("keeps a value that is already a known option (trimmed)", () => {
    expect(codeLanguageSelectValue("typescript")).toBe("typescript");
    expect(codeLanguageSelectValue("  python ")).toBe("python");
  });

  it("resolves an alias when it lands on a known option", () => {
    expect(codeLanguageSelectValue("bash")).toBe("shell");
    expect(codeLanguageSelectValue("ts")).toBe("typescript");
    expect(codeLanguageSelectValue("YML")).toBe("yaml");
  });

  it("passes a legacy / custom value straight through", () => {
    expect(codeLanguageSelectValue("cobol")).toBe("cobol");
    expect(codeLanguageSelectValue("fortran")).toBe("fortran");
  });
});
