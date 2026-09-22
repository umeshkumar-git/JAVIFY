import { describe, it, expect, vi } from "vitest";
import { withSwrCache } from "../../src/utils/cache.js";

describe("withSwrCache (Stale-While-Revalidate with Thundering Herd Mutex)", () => {
  it("returns fresh cached data immediately without executing loader", async () => {
    let loaderCalls = 0;
    const loader = async () => {
      loaderCalls++;
      return { data: "top_charts_v1" };
    };

    const key = `test_swr_fresh_${Date.now()}`;

    // First call: Cache miss -> executes loader
    const res1 = await withSwrCache(key, 60, 120, loader);
    expect(res1.data).toBe("top_charts_v1");
    expect(loaderCalls).toBe(1);

    // Second call: Fresh hit -> does NOT execute loader
    const res2 = await withSwrCache(key, 60, 120, loader);
    expect(res2.data).toBe("top_charts_v1");
    expect(loaderCalls).toBe(1);
  });

  it("serves stale data immediately and revalidates in the background", async () => {
    let version = 1;
    const loader = async () => {
      return { data: `version_${version++}` };
    };

    const key = `test_swr_stale_${Date.now()}`;

    // Fresh TTL: 0.1s (100ms), Stale TTL: 5s
    const res1 = await withSwrCache(key, 0.1, 5, loader);
    expect(res1.data).toBe("version_1");

    // Wait 120ms so fresh TTL expires but stale TTL remains active
    await new Promise((resolve) => setTimeout(resolve, 130));

    // Stale read: Returns stale data immediately (version_1)
    const res2 = await withSwrCache(key, 0.1, 5, loader);
    expect(res2.data).toBe("version_1");

    // Wait 50ms for background revalidation to finish
    await new Promise((resolve) => setTimeout(resolve, 60));

    // Subsequent read: Sees fresh background revalidated data (version_2)
    const res3 = await withSwrCache(key, 0.1, 5, loader);
    expect(res3.data).toBe("version_2");
  });

  it("prevents thundering herd when concurrent requests hit an expired item", async () => {
    let loaderCalls = 0;
    const slowLoader = async () => {
      loaderCalls++;
      await new Promise((r) => setTimeout(r, 40));
      return { timestamp: Date.now() };
    };

    const key = `test_swr_herd_${Date.now()}`;

    // Fire 5 concurrent requests simultaneously
    const results = await Promise.all([
      withSwrCache(key, 60, 60, slowLoader),
      withSwrCache(key, 60, 60, slowLoader),
      withSwrCache(key, 60, 60, slowLoader),
      withSwrCache(key, 60, 60, slowLoader),
      withSwrCache(key, 60, 60, slowLoader),
    ]);

    // All callers receive valid data
    expect(results).toHaveLength(5);
    results.forEach((r) => expect(r.timestamp).toBeDefined());

    // Due to mutex locking, loader was executed only once
    expect(loaderCalls).toBe(1);
  });
});
