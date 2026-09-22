import { describe, it, expect } from "vitest";
import { LRUCache } from "../LRUCache";

describe("LRUCache (Doubly Linked List + Hash Map Architecture)", () => {
  it("stores and retrieves items in O(1) time", () => {
    const cache = new LRUCache<string, string>(3);
    cache.put("a", "alpha");
    cache.put("b", "beta");

    expect(cache.get("a")).toBe("alpha");
    expect(cache.get("b")).toBe("beta");
    expect(cache.get("c")).toBeUndefined();
    expect(cache.size).toBe(2);
  });

  it("evicts the least recently used element when capacity is exceeded", () => {
    const cache = new LRUCache<string, number>(3);
    cache.put("k1", 100);
    cache.put("k2", 200);
    cache.put("k3", 300);

    expect(cache.keys()).toEqual(["k3", "k2", "k1"]);

    // Insert 4th element: k1 should be evicted as the LRU
    cache.put("k4", 400);

    expect(cache.has("k1")).toBe(false);
    expect(cache.get("k1")).toBeUndefined();
    expect(cache.get("k4")).toBe(400);
    expect(cache.size).toBe(3);
    expect(cache.keys()).toEqual(["k4", "k3", "k2"]);
  });

  it("promotes an element to Most Recently Used (MRU) upon access (get)", () => {
    const cache = new LRUCache<string, string>(3);
    cache.put("x", "1");
    cache.put("y", "2");
    cache.put("z", "3");

    // Order is currently: z (MRU) -> y -> x (LRU)
    expect(cache.keys()).toEqual(["z", "y", "x"]);

    // Access 'x', promoting it to MRU: x (MRU) -> z -> y (LRU)
    cache.get("x");
    expect(cache.keys()).toEqual(["x", "z", "y"]);

    // Now insert 'w': 'y' should be evicted, NOT 'x'
    cache.put("w", "4");

    expect(cache.has("y")).toBe(false);
    expect(cache.has("x")).toBe(true);
    expect(cache.keys()).toEqual(["w", "x", "z"]);
  });

  it("updates value and promotes to MRU on put with existing key", () => {
    const cache = new LRUCache<string, string>(2);
    cache.put("k1", "first");
    cache.put("k2", "second");

    // Update k1
    cache.put("k1", "first_updated");
    expect(cache.keys()).toEqual(["k1", "k2"]);

    // Insert k3 -> k2 should be evicted
    cache.put("k3", "third");
    expect(cache.has("k2")).toBe(false);
    expect(cache.get("k1")).toBe("first_updated");
  });

  it("deletes items and tracks telemetry statistics accurately", () => {
    const cache = new LRUCache<string, number>(2);
    cache.put("a", 1);
    cache.put("b", 2);

    expect(cache.delete("a")).toBe(true);
    expect(cache.size).toBe(1);
    expect(cache.has("a")).toBe(false);

    // Hit & miss metrics
    cache.get("b"); // Hit
    cache.get("missing"); // Miss
    cache.put("c", 3);
    cache.put("d", 4); // Eviction occurs

    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.evictions).toBe(1);
    expect(stats.hitRatio).toBe(0.5);
  });

  it("throws an error for zero or negative capacity", () => {
    expect(() => new LRUCache(0)).toThrow();
    expect(() => new LRUCache(-5)).toThrow();
  });
});
