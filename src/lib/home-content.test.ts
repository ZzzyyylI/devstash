import { describe, expect, it } from "vitest";

import { COPYRIGHT_START_YEAR, copyrightYears } from "./home-content";

describe("copyrightYears", () => {
  it("shows just the start year during the start year", () => {
    expect(copyrightYears(new Date(COPYRIGHT_START_YEAR, 8, 7))).toBe(
      String(COPYRIGHT_START_YEAR),
    );
  });

  it("shows a range once the calendar moves past the start year", () => {
    expect(copyrightYears(new Date(COPYRIGHT_START_YEAR + 2, 5, 15))).toBe(
      `${COPYRIGHT_START_YEAR}–${COPYRIGHT_START_YEAR + 2}`,
    );
  });

  it("never renders a range that ends before the start year", () => {
    expect(copyrightYears(new Date(COPYRIGHT_START_YEAR - 5, 5, 1))).toBe(
      String(COPYRIGHT_START_YEAR),
    );
  });
});
