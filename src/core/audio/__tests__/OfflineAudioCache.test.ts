import { describe, it, expect } from "vitest";
import { OfflineAudioCache } from "../OfflineAudioCache";

describe("OfflineAudioCache (IndexedDB Storage Engine)", () => {
  it("initializes without throwing errors", () => {
    const cache = new OfflineAudioCache();
    expect(cache).toBeDefined();
  });

  it("returns fallback storage estimate when navigator.storage is unavailable", async () => {
    const cache = new OfflineAudioCache();
    const estimate = await cache.getStorageEstimate();

    expect(estimate).toHaveProperty("usageMB");
    expect(estimate).toHaveProperty("quotaMB");
    expect(typeof estimate.usageMB).toBe("number");
    expect(typeof estimate.quotaMB).toBe("number");
  });
});
