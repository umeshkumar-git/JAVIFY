import { describe, it, expect } from "vitest";
import { calculateVirtualWindow } from "../VirtualList";

describe("VirtualList (DOM-Recycling Virtual Windowing)", () => {
  const TOTAL_TRACKS = 10000;
  const ITEM_HEIGHT = 64; // px
  const CONTAINER_HEIGHT = 520; // px
  const OVERSCAN = 3;

  it("calculates window correctly at initial top scroll position (scrollTop = 0)", () => {
    const window = calculateVirtualWindow(0, CONTAINER_HEIGHT, ITEM_HEIGHT, TOTAL_TRACKS, OVERSCAN);

    expect(window.startIndex).toBe(0);
    // visibleCount = ceil(520 / 64) = 9
    expect(window.visibleCount).toBe(9);
    // endIndex = min(10000, 0 + 9 + 3) = 12
    expect(window.endIndex).toBe(12);
    // renderedCount = 12 - 0 = 12 items mounted
    expect(window.renderedCount).toBe(12);
    expect(window.offsetY).toBe(0);
    expect(window.totalHeight).toBe(TOTAL_TRACKS * ITEM_HEIGHT);
  });

  it("strictly caps mounted elements to ~15-20 rows when scrolled deep into the catalog", () => {
    // Scroll to item #5000 (scrollTop = 5000 * 64 = 320,000)
    const scrollTop = 5000 * ITEM_HEIGHT;
    const window = calculateVirtualWindow(scrollTop, CONTAINER_HEIGHT, ITEM_HEIGHT, TOTAL_TRACKS, OVERSCAN);

    // rawStartIndex = 5000; startIndex = 5000 - 3 = 4997
    expect(window.startIndex).toBe(4997);
    // visibleCount = 9; endIndex = min(10000, 5000 + 9 + 3) = 5012
    expect(window.endIndex).toBe(5012);
    // renderedCount = 5012 - 4997 = 15 rows mounted
    expect(window.renderedCount).toBe(15);
    // Verified: out of 10,000 tracks, only 15 DOM elements exist in memory!
    const unmountedRatio = (TOTAL_TRACKS - window.renderedCount) / TOTAL_TRACKS;
    expect(unmountedRatio).toBeGreaterThan(0.998); // > 99.8% DOM recycling efficiency
    expect(window.offsetY).toBe(4997 * ITEM_HEIGHT);
  });

  it("safely clamps bounds at the very bottom of the catalog", () => {
    const maxScroll = (TOTAL_TRACKS * ITEM_HEIGHT) - CONTAINER_HEIGHT;
    const window = calculateVirtualWindow(maxScroll, CONTAINER_HEIGHT, ITEM_HEIGHT, TOTAL_TRACKS, OVERSCAN);

    expect(window.endIndex).toBe(TOTAL_TRACKS);
    expect(window.renderedCount).toBeLessThanOrEqual(16);
    expect(window.offsetY).toBeLessThanOrEqual(window.totalHeight);
  });

  it("handles edge cases (empty list, zero height)", () => {
    const emptyWindow = calculateVirtualWindow(0, CONTAINER_HEIGHT, ITEM_HEIGHT, 0, OVERSCAN);
    expect(emptyWindow.renderedCount).toBe(0);
    expect(emptyWindow.totalHeight).toBe(0);

    const zeroHeight = calculateVirtualWindow(0, 0, ITEM_HEIGHT, 100, OVERSCAN);
    expect(zeroHeight.renderedCount).toBe(0);
  });
});
