import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { debounce } from "../useDebounce";

describe("useDebounce & Input Throttling Engine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("coalesces rapid successive function calls into a single invocation after delay", () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 300);

    // User types "c-y-b-e-r" rapidly
    debouncedFn("c");
    vi.advanceTimersByTime(50);
    debouncedFn("cy");
    vi.advanceTimersByTime(50);
    debouncedFn("cyb");
    vi.advanceTimersByTime(50);
    debouncedFn("cybe");
    vi.advanceTimersByTime(50);
    debouncedFn("cyber");

    // Has not yet fired because delay has not elapsed
    expect(mockFn).not.toHaveBeenCalled();

    // Advance remaining time (250ms + 50ms = 300ms)
    vi.advanceTimersByTime(300);

    // Exactly one call fired with the final search query
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith("cyber");
  });

  it("cancels pending execution when cancel is called", () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 200);

    debouncedFn("search term");
    vi.advanceTimersByTime(100);

    debouncedFn.cancel();
    vi.advanceTimersByTime(200);

    expect(mockFn).not.toHaveBeenCalled();
  });

  it("flushes immediately when flush is invoked", () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 500);

    debouncedFn("immediate term");
    expect(mockFn).not.toHaveBeenCalled();

    debouncedFn.flush();
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith("immediate term");

    // Further timer advancement should not trigger duplicate call
    vi.advanceTimersByTime(600);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});
