import logger from "../utils/logger.js";
import { withSwrCache } from "../utils/cache.js";
import { SEED_TRACKS } from "./gatewayProxy.service.js";

/**
 * Server-side store of verified streaming tokens.
 * In a production cluster, this can be stored in Redis or DB.
 */
const activeBffSessions = new Map();

/**
 * Exchanges client OAuth authorization code for session tokens.
 * Secures client secrets entirely on the backend server.
 */
export async function exchangeOAuthToken({ code, provider = "spotify" }) {
  logger.info("bff.oauth_exchange", { provider, codePrefix: code?.substring(0, 4) });

  // Server-side secret credentials (never leaked to frontend bundle)
  const serverClientId = process.env.STREAM_PROVIDER_CLIENT_ID || "javify_bff_client_id";
  const serverClientSecret = process.env.STREAM_PROVIDER_SECRET || "javify_bff_secret";

  // Simulate token grant from upstream provider
  const token = `bff_tok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  const session = {
    userId: `usr_${Math.random().toString(36).substring(2, 8)}`,
    username: "Audiophile Pioneer",
    provider,
    token,
    grantedAt: Date.now(),
    expiresIn: 3600,
  };

  activeBffSessions.set(token, session);
  return session;
}

/**
 * Verifies the HTTP-only session token from cookies.
 */
export function verifySessionToken(token) {
  if (!token) return null;
  return activeBffSessions.get(token) || null;
}

/**
 * Clears the session on logout.
 */
export function revokeSessionToken(token) {
  if (token) {
    activeBffSessions.delete(token);
  }
}

/**
 * Global Top Charts Provider with Stale-While-Revalidate (SWR) Redis Caching.
 * Cached for 300s (5m) fresh, 900s (15m) stale.
 */
export async function getTopCharts({ country = "GLOBAL", limit = 10 } = {}) {
  const cacheKey = `bff:charts:${country}:${limit}`;

  return withSwrCache(
    cacheKey,
    300, // 5 min fresh
    900, // 15 min stale serving with background refresh
    async () => {
      logger.info("bff.upstream_fetch_charts", { country, limit });

      // Simulated upstream provider API call
      const charts = [
        ...SEED_TRACKS,
        {
          id: "trk-top-04",
          title: "Starlight Synthesizer",
          artist: "Aura Cluster",
          album: "Galactic Frequencies",
          duration: 210,
          genre: "Synthwave",
          bpm: 124,
          url: "/audio/cybernetic-drift.wav",
          coverUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80",
          waveform: [0.15, 0.42, 0.73, 0.88, 0.95, 0.81, 0.64, 0.49, 0.58, 0.82, 0.91, 0.65, 0.43, 0.31],
        },
        {
          id: "trk-top-05",
          title: "Echoes of Silicon Valley",
          artist: "Quantum Echo",
          album: "Algorithmics",
          duration: 195,
          genre: "Glitch Hop",
          bpm: 118,
          url: "/audio/quantum-telemetry.wav",
          coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80",
          waveform: [0.28, 0.51, 0.67, 0.79, 0.84, 0.72, 0.61, 0.54, 0.69, 0.85, 0.92, 0.78, 0.55, 0.41],
        },
      ];

      return {
        chartName: `Top 50 - ${country}`,
        updatedAt: new Date().toISOString(),
        tracks: charts.slice(0, limit),
      };
    },
    { country, limit }
  );
}

/**
 * Search proxy with SWR caching for repeated search queries.
 */
export async function searchCatalog(query, limit = 20) {
  if (!query || !query.trim()) {
    return { tracks: [], total: 0 };
  }

  const cleanQuery = query.toLowerCase().trim();
  const cacheKey = `bff:search:${cleanQuery}:${limit}`;

  return withSwrCache(
    cacheKey,
    180, // 3 min fresh
    600, // 10 min stale
    async () => {
      logger.info("bff.upstream_search", { query: cleanQuery });

      const all = [...SEED_TRACKS];
      const matched = all.filter(
        (t) =>
          t.title.toLowerCase().includes(cleanQuery) ||
          t.artist.toLowerCase().includes(cleanQuery) ||
          t.genre.toLowerCase().includes(cleanQuery)
      );

      return {
        query: cleanQuery,
        tracks: matched.slice(0, limit),
        total: matched.length,
      };
    }
  );
}

/**
 * Resolves upstream track stream metadata for proxying.
 */
export function getTrackStreamMetadata(trackId) {
  const track = SEED_TRACKS.find((t) => t.id === trackId);
  if (!track) {
    return null;
  }
  return {
    trackId: track.id,
    streamUrl: track.url,
    title: track.title,
    artist: track.artist,
  };
}
