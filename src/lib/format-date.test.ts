import { describe, expect, it } from "vitest";

import {
  formatLongDate,
  formatMediumDate,
  formatShortDate,
} from "@/lib/format-date";

// Use a mid-month, midday UTC date so no timezone shifts it across a day boundary.
const d = new Date("2026-01-15T12:00:00Z");

describe("format-date", () => {
  it("formatShortDate: 'Mon D'", () => {
    expect(formatShortDate(d)).toBe("Jan 15");
  });

  it("formatMediumDate: 'Mon D, YYYY'", () => {
    expect(formatMediumDate(d)).toBe("Jan 15, 2026");
  });

  it("formatLongDate: 'Month D, YYYY' from a Date", () => {
    expect(formatLongDate(d)).toBe("January 15, 2026");
  });

  it("formatLongDate also accepts an ISO string", () => {
    expect(formatLongDate("2026-01-15T12:00:00Z")).toBe("January 15, 2026");
  });
});
