import { describe, expect, it } from "vitest";

import { palette } from "@/lib/type-presentation";

describe("palette", () => {
  it("maps a known hex to its Tailwind class set", () => {
    expect(palette("#3b82f6")).toEqual({
      text: "text-blue-500",
      border: "border-l-blue-500",
      dot: "bg-blue-500",
    });
  });

  it("falls back for an unknown hex", () => {
    expect(palette("#123456")).toEqual({
      text: "text-muted-foreground",
      border: "border-l-border",
      dot: "bg-border",
    });
  });

  it("falls back for null / undefined", () => {
    expect(palette(null).text).toBe("text-muted-foreground");
    expect(palette(undefined).border).toBe("border-l-border");
  });
});
