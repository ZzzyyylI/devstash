import { describe, expect, it } from "vitest";

import {
  autoTagSchema,
  describeItemSchema,
  explainCodeSchema,
  optimizePromptSchema,
} from "@/lib/validations/ai";

describe("autoTagSchema", () => {
  it("accepts a title with content and trims both", () => {
    const parsed = autoTagSchema.parse({
      title: "  useDebounce hook  ",
      content: "  export function useDebounce() {}  ",
    });
    expect(parsed).toEqual({
      title: "useDebounce hook",
      content: "export function useDebounce() {}",
    });
  });

  it("collapses missing / blank content to null", () => {
    expect(autoTagSchema.parse({ title: "x" }).content).toBeNull();
    expect(autoTagSchema.parse({ title: "x", content: "   " }).content).toBeNull();
    expect(autoTagSchema.parse({ title: "x", content: null }).content).toBeNull();
  });

  it("rejects an empty title", () => {
    expect(autoTagSchema.safeParse({ title: "   " }).success).toBe(false);
    expect(autoTagSchema.safeParse({ content: "hi" }).success).toBe(false);
  });

  it("rejects an over-long title", () => {
    expect(
      autoTagSchema.safeParse({ title: "x".repeat(201) }).success,
    ).toBe(false);
  });
});

describe("describeItemSchema", () => {
  it("trims the required fields and normalises the optional ones", () => {
    const parsed = describeItemSchema.parse({
      title: "  useDebounce hook  ",
      type: "  snippet  ",
      content: "  export function useDebounce() {}  ",
      url: "  ",
      language: "  typescript ",
      description: null,
    });
    expect(parsed).toEqual({
      title: "useDebounce hook",
      type: "snippet",
      content: "export function useDebounce() {}",
      url: null,
      language: "typescript",
      description: null,
    });
  });

  it("collapses missing optional fields to null", () => {
    const parsed = describeItemSchema.parse({ title: "x", type: "note" });
    expect(parsed).toEqual({
      title: "x",
      type: "note",
      content: null,
      url: null,
      language: null,
      description: null,
    });
  });

  it("requires a non-empty title and type", () => {
    expect(
      describeItemSchema.safeParse({ title: "   ", type: "note" }).success,
    ).toBe(false);
    expect(
      describeItemSchema.safeParse({ title: "x", type: "  " }).success,
    ).toBe(false);
    expect(describeItemSchema.safeParse({ title: "x" }).success).toBe(false);
  });

  it("rejects an over-long title", () => {
    expect(
      describeItemSchema.safeParse({ title: "x".repeat(201), type: "note" })
        .success,
    ).toBe(false);
  });
});

describe("explainCodeSchema", () => {
  it("trims the required fields and normalises the optional ones", () => {
    const parsed = explainCodeSchema.parse({
      title: "  groupBy util  ",
      content: "  export function groupBy() {}  ",
      language: "  typescript ",
      type: "  snippet  ",
    });
    expect(parsed).toEqual({
      title: "groupBy util",
      content: "export function groupBy() {}",
      language: "typescript",
      type: "snippet",
    });
  });

  it("collapses missing optional fields to null", () => {
    const parsed = explainCodeSchema.parse({ title: "x", content: "echo hi" });
    expect(parsed).toEqual({
      title: "x",
      content: "echo hi",
      language: null,
      type: null,
    });
  });

  it("requires a non-empty title and content", () => {
    expect(
      explainCodeSchema.safeParse({ title: "  ", content: "echo hi" }).success,
    ).toBe(false);
    expect(
      explainCodeSchema.safeParse({ title: "x", content: "   " }).success,
    ).toBe(false);
    expect(explainCodeSchema.safeParse({ title: "x" }).success).toBe(false);
  });

  it("rejects an over-long title", () => {
    expect(
      explainCodeSchema.safeParse({ title: "x".repeat(201), content: "echo" })
        .success,
    ).toBe(false);
  });
});

describe("optimizePromptSchema", () => {
  it("trims the title and content", () => {
    const parsed = optimizePromptSchema.parse({
      title: "  Summarize a PR  ",
      content: "  write a summary of this pull request  ",
    });
    expect(parsed).toEqual({
      title: "Summarize a PR",
      content: "write a summary of this pull request",
    });
  });

  it("requires a non-empty title and content", () => {
    expect(
      optimizePromptSchema.safeParse({ title: "  ", content: "do a thing" })
        .success,
    ).toBe(false);
    expect(
      optimizePromptSchema.safeParse({ title: "x", content: "   " }).success,
    ).toBe(false);
    expect(optimizePromptSchema.safeParse({ title: "x" }).success).toBe(false);
  });

  it("rejects an over-long title", () => {
    expect(
      optimizePromptSchema.safeParse({
        title: "x".repeat(201),
        content: "do a thing",
      }).success,
    ).toBe(false);
  });
});
