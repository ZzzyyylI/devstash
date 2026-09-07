import { describe, expect, it } from "vitest";

import {
  COLLECTIONS_PER_PAGE,
  DASHBOARD_COLLECTIONS_LIMIT,
  DASHBOARD_RECENT_ITEMS_LIMIT,
  ELLIPSIS,
  ITEMS_PER_PAGE,
  pageWindow,
  paginate,
  parsePageParam,
} from "@/lib/pagination";

describe("pagination constants", () => {
  it("match the spec", () => {
    expect(ITEMS_PER_PAGE).toBe(21);
    expect(COLLECTIONS_PER_PAGE).toBe(21);
    expect(DASHBOARD_COLLECTIONS_LIMIT).toBe(6);
    expect(DASHBOARD_RECENT_ITEMS_LIMIT).toBe(10);
  });
});

describe("parsePageParam", () => {
  it("defaults to 1 for missing / invalid / non-positive values", () => {
    expect(parsePageParam(undefined)).toBe(1);
    expect(parsePageParam("")).toBe(1);
    expect(parsePageParam("abc")).toBe(1);
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("-4")).toBe(1);
    expect(parsePageParam("2.5")).toBe(1);
  });

  it("parses a positive integer", () => {
    expect(parsePageParam("3")).toBe(3);
    expect(parsePageParam("42")).toBe(42);
  });

  it("uses the first entry when given an array", () => {
    expect(parsePageParam(["5", "9"])).toBe(5);
  });
});

describe("paginate", () => {
  it("computes skip/take and a clamped page for an in-range request", () => {
    expect(paginate(50, 2, 21)).toEqual({
      page: 2,
      pageCount: 3,
      total: 50,
      skip: 21,
      take: 21,
    });
  });

  it("clamps a request past the last page to the last page", () => {
    const slice = paginate(50, 99, 21);
    expect(slice.page).toBe(3);
    expect(slice.skip).toBe(42);
  });

  it("always yields at least one page, even with no rows", () => {
    expect(paginate(0, 1, 21)).toEqual({
      page: 1,
      pageCount: 1,
      total: 0,
      skip: 0,
      take: 21,
    });
  });

  it("rounds a fractional last page up", () => {
    expect(paginate(22, 1, 21).pageCount).toBe(2);
  });
});

describe("pageWindow", () => {
  it("lists every page when there are 7 or fewer", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("windows around the current page with ellipses for many pages", () => {
    expect(pageWindow(1, 10)).toEqual([1, 2, ELLIPSIS, 10]);
    expect(pageWindow(5, 10)).toEqual([1, ELLIPSIS, 4, 5, 6, ELLIPSIS, 10]);
    expect(pageWindow(10, 10)).toEqual([1, ELLIPSIS, 9, 10]);
  });

  it("omits an ellipsis when the gap is a single page", () => {
    expect(pageWindow(3, 10)).toEqual([1, 2, 3, 4, ELLIPSIS, 10]);
    expect(pageWindow(8, 10)).toEqual([1, ELLIPSIS, 7, 8, 9, 10]);
  });
});
