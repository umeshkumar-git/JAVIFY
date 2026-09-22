import logger from "../utils/logger.js";
import { redisClient, isCacheEnabled, getCachedValue, setCachedValue } from "../utils/cache.js";

/**
 * Curated high-fidelity audio streams for playback, testing, and real-time synchronization.
 */
export const SEED_TRACKS = [
  {
    id: "trk-synth-01",
    title: "Cybernetic Drift",
    artist: "Kavinsky Protocol",
    album: "Neon Architecture Vol. 1",
    duration: 184,
    genre: "Synthwave / Cyberpunk",
    bpm: 128,
    url: "https://actions.google.com/sounds/v1/science_fiction/alien_spaceship_atmosphere.ogg",
    coverUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
    waveform: [0.12, 0.35, 0.68, 0.92, 0.74, 0.45, 0.32, 0.58, 0.81, 0.95, 0.62, 0.41, 0.28, 0.77, 0.89],
  },
  {
    id: "trk-ambient-02",
    title: "Quantum Telemetry",
    artist: "Solaris Array",
    album: "Deep Orbit Telemetry",
    duration: 215,
    genre: "Ambient Lo-Fi",
    bpm: 94,
    url: "https://actions.google.com/sounds/v1/science_fiction/scifi_telemetry.ogg",
    coverUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    waveform: [0.22, 0.45, 0.51, 0.33, 0.42, 0.65, 0.88, 0.91, 0.73, 0.54, 0.38, 0.49, 0.72, 0.84, 0.41],
  },
  {
    id: "trk-future-03",
    title: "Distributed Heartbeat",
    artist: "Subsystem X",
    album: "Zero Drift",
    duration: 198,
    genre: "Electro Orchestral",
    bpm: 132,
    url: "https://actions.google.com/sounds/v1/science_fiction/space_engine_large.ogg",
    coverUrl: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=600&auto=format&fit=crop&q=80",
    waveform: [0.35, 0.55, 0.78, 0.82, 0.64, 0.59, 0.72, 0.85, 0.96, 0.81, 0.67, 0.52, 0.44, 0.63, 0.79],
  },
];

/**
 * Token manager with distributed mutex lock.
 * Prevents "thundering herd" when 50 concurrent requests hit an expired token.
 */
class GatewayTokenManager {
  constructor() {
    this.inFlightRefreshPromise = null;
  }

  async getValidToken() {
    const cachedToken = await getCachedValue("gateway:upstream_token");
    if (cachedToken) {
      return cachedToken;
    }

    // Mutex: Single-flight in-memory promise
    if (this.inFlightRefreshPromise) {
      return this.inFlightRefreshPromise;
    }

    this.inFlightRefreshPromise = this.refreshTokenWithLock();
    try {
      return await this.inFlightRefreshPromise;
    } finally {
      this.inFlightRefreshPromise = null;
    }
  }

  async refreshTokenWithLock() {
    const lockKey = "lock:gateway_token_refresh";
    const lockTtlSeconds = 10;
    let lockAcquired = false;

    try {
      const redisAvailable = await isCacheEnabled();
      if (redisAvailable) {
        // SETNX with TTL
        const result = await redisClient.set(lockKey, "locked", {
          NX: true,
          EX: lockTtlSeconds,
        });
        lockAcquired = result === "OK";
      } else {
        lockAcquired = true;
      }

      if (!lockAcquired) {
        // Wait 100ms and re-check cache
        await new Promise((resolve) => setTimeout(resolve, 150));
        return (await getCachedValue("gateway:upstream_token")) || "fallback_ephemeral_token";
      }

      logger.info("gateway_token.refreshing", { module: "gatewayProxy" });

      // Simulated upstream provider token grant
      const simulatedToken = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      const tokenTtlSeconds = 3600;

      await setCachedValue("gateway:upstream_token", simulatedToken, tokenTtlSeconds);

      logger.info("gateway_token.refreshed_successfully", {
        module: "gatewayProxy",
        tokenTtlSeconds,
      });

      return simulatedToken;
    } catch (err) {
      logger.error("gateway_token.refresh_failed", { error: err.message });
      return "fallback_ephemeral_token";
    } finally {
      if (lockAcquired && (await isCacheEnabled())) {
        await redisClient.del(lockKey).catch(() => {});
      }
    }
  }
}

export const tokenManager = new GatewayTokenManager();

/**
 * Returns a catalog of tracks with optional simulated scale (1 to 10,000)
 * for stress testing virtualized rendering and caching.
 */
export function getCatalog({ limit = 50, offset = 0, scale = false } = {}) {
  if (!scale) {
    const paged = SEED_TRACKS.slice(offset, offset + limit);
    return {
      tracks: paged,
      total: SEED_TRACKS.length,
      limit,
      offset,
    };
  }

  // Generates virtual catalog up to 10,000 items on-demand
  const TOTAL_SCALE_ITEMS = 10000;
  const tracks = [];
  const end = Math.min(offset + limit, TOTAL_SCALE_ITEMS);

  const GENRES = ["Synthwave", "Cyberpunk", "Dark Ambient", "Lo-Fi Beats", "Neurofunk", "Deep Techno"];
  const ARTISTS = ["Kavinsky Protocol", "Solaris Array", "Subsystem X", "Binary Monks", "Quantum Echo", "Null Pointer"];

  for (let i = offset; i < end; i++) {
    const seed = SEED_TRACKS[i % SEED_TRACKS.length];
    const artist = ARTISTS[i % ARTISTS.length];
    const genre = GENRES[i % GENRES.length];

    tracks.push({
      id: `trk-scale-${i + 1}`,
      title: `${seed.title} (Node #${i + 1})`,
      artist: `${artist} feat. Cluster ${(i % 16) + 1}`,
      album: `Scale Benchmark 10k - Volume ${Math.floor(i / 100) + 1}`,
      duration: 160 + (i % 120),
      genre,
      bpm: 110 + (i % 40),
      url: seed.url,
      coverUrl: seed.coverUrl,
      waveform: seed.waveform,
    });
  }

  return {
    tracks,
    total: TOTAL_SCALE_ITEMS,
    limit,
    offset,
  };
}
