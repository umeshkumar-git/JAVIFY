import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRedis } = vi.hoisted(() => {
  const mockRedis = {
    isOpen: true,
    isReady: true,
    connect: vi.fn(async () => {
      mockRedis.isOpen = true;
      mockRedis.isReady = true;
    }),
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
    on: vi.fn(),
  };

  return { mockRedis };
});

vi.mock("redis", () => ({
  createClient: vi.fn(() => mockRedis),
}));

vi.mock("../../src/utils/logger.js", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  connectRedis,
  deleteCachedKey,
  getCachedValue,
  invalidateCachePattern,
  setCachedValue,
  withCache,
} from "../../src/utils/cache.js";

describe("cache utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis.isOpen = true;
    mockRedis.isReady = true;
  });

  it("connects to Redis when it is not already open", async () => {
    mockRedis.isOpen = false;
    const client = await connectRedis();

    expect(mockRedis.connect).toHaveBeenCalled();
    expect(client).toBe(mockRedis);
  });

  it("reads and writes cached values with TTL support", async () => {
    mockRedis.get.mockResolvedValue(JSON.stringify({ ok: true }));
    const cached = await getCachedValue("test:key");
    expect(cached).toEqual({ ok: true });

    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue("OK");
    const saved = await setCachedValue("another:key", { id: 1 }, 60);
    expect(saved).toBe(true);
    expect(mockRedis.set).toHaveBeenCalledWith(
      "another:key",
      JSON.stringify({ id: 1 }),
      { EX: 60 },
    );
  });

  it("deletes keys and invalidates matching cache patterns", async () => {
    mockRedis.del.mockResolvedValue(1);
    mockRedis.keys.mockResolvedValue(["user:1", "user:2"]);

    expect(await deleteCachedKey("user:1")).toBe(true);
    expect(await invalidateCachePattern("user:*")).toBe(true);
  });

  it("returns cached values immediately on a hit and fills the cache on a miss", async () => {
    const loader = vi.fn(async () => ({ hello: "world" }));

    mockRedis.get.mockResolvedValueOnce(JSON.stringify({ cached: true }));
    const hit = await withCache("cache:hit", 10, loader, { domain: "test" });
    expect(hit).toEqual({ cached: true });

    mockRedis.get.mockResolvedValueOnce(null);
    const miss = await withCache("cache:miss", 10, loader, { domain: "test" });
    expect(loader).toHaveBeenCalledTimes(1);
    expect(miss).toEqual({ hello: "world" });
    expect(mockRedis.set).toHaveBeenCalledWith(
      "cache:miss",
      JSON.stringify({ hello: "world" }),
      { EX: 10 },
    );
  });
});
