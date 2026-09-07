import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { debounce } from "@/lib/debounce";

describe("debounce", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("does not call through before the delay elapses", () => {
    const fn = vi.fn();
    const d = debounce(fn, 250);
    d("a");
    vi.advanceTimersByTime(249);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledExactlyOnceWith("a");
  });

  it("coalesces rapid calls into one, with the latest args", () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d("a");
    vi.advanceTimersByTime(50);
    d("b");
    vi.advanceTimersByTime(50);
    d("c");
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledExactlyOnceWith("c");
  });

  it("flush() runs the pending call immediately with the latest args", () => {
    const fn = vi.fn();
    const d = debounce(fn, 1000);
    d("x");
    d("y");
    d.flush();
    expect(fn).toHaveBeenCalledExactlyOnceWith("y");
    // nothing left to fire
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("flush() with nothing pending is a no-op", () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d.flush();
    expect(fn).not.toHaveBeenCalled();
  });

  it("cancel() drops the pending call", () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d("a");
    d.cancel();
    vi.advanceTimersByTime(500);
    expect(fn).not.toHaveBeenCalled();
  });
});
