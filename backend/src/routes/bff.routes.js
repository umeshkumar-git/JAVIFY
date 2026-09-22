import { Router } from "express";
import {
  exchangeOAuthToken,
  verifySessionToken,
  revokeSessionToken,
  getTopCharts,
  searchCatalog,
  getTrackStreamMetadata,
} from "../services/bff.service.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";
import { createRedisRateLimiter } from "../middleware/redisRateLimiter.js";
import logger from "../utils/logger.js";

const router = Router();

// Distributed rate limiter for BFF API (120 req/min)
const bffLimiter = createRedisRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  keyPrefix: "rl:bff",
});

router.use(bffLimiter);

const COOKIE_NAME = "javify_stream_token";

/**
 * POST /api/bff/auth/exchange
 * Server-side OAuth exchange setting httpOnly cookie.
 */
router.post("/auth/exchange", async (req, res) => {
  try {
    const { code, provider } = req.body;
    const session = await exchangeOAuthToken({ code, provider });

    // Set secure HTTP-Only cookie containing the session token
    res.cookie(COOKIE_NAME, session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });

    return res.json(
      successResponse({
        userId: session.userId,
        username: session.username,
        provider: session.provider,
        authenticated: true,
      })
    );
  } catch (err) {
    logger.error("bff.auth_exchange_failed", { error: err.message });
    return res.status(500).json(errorResponse("AUTH_EXCHANGE_ERROR", err.message));
  }
});

/**
 * GET /api/bff/auth/session
 * Verifies session using httpOnly cookie.
 */
router.get("/auth/session", (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  const session = verifySessionToken(token);

  if (!session) {
    return res.status(401).json(errorResponse("UNAUTHENTICATED", "No active streaming session."));
  }

  return res.json(
    successResponse({
      userId: session.userId,
      username: session.username,
      provider: session.provider,
      authenticated: true,
    })
  );
});

/**
 * POST /api/bff/auth/logout
 * Clears session cookie.
 */
router.post("/auth/logout", (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  revokeSessionToken(token);

  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return res.json(successResponse({ loggedOut: true }));
});

/**
 * GET /api/bff/charts
 * Returns SWR-cached top charts without direct upstream client calls.
 */
router.get("/charts", async (req, res) => {
  try {
    const country = req.query.country || "GLOBAL";
    const limit = Math.min(parseInt(req.query.limit || "10", 10), 50);

    const charts = await getTopCharts({ country, limit });
    return res.json(successResponse(charts));
  } catch (err) {
    logger.error("bff.charts_error", { error: err.message });
    return res.status(500).json(errorResponse("CHARTS_FETCH_ERROR", err.message));
  }
});

/**
 * GET /api/bff/search
 * Proxies search queries with SWR caching.
 */
router.get("/search", async (req, res) => {
  try {
    const q = req.query.q || "";
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 50);

    const result = await searchCatalog(q, limit);
    return res.json(successResponse(result));
  } catch (err) {
    logger.error("bff.search_error", { error: err.message });
    return res.status(500).json(errorResponse("SEARCH_ERROR", err.message));
  }
});

/**
 * GET /api/bff/stream/:trackId
 * Safe streaming proxy with RFC 7233 byte-range support.
 * Shields upstream CDN URLs and access credentials from the frontend client.
 */
router.get("/stream/:trackId", async (req, res) => {
  try {
    const { trackId } = req.params;
    const metadata = getTrackStreamMetadata(trackId);

    if (!metadata) {
      return res.status(404).json(errorResponse("TRACK_NOT_FOUND", `Track ${trackId} not found.`));
    }

    const range = req.headers.range;
    const upstreamHeaders = range ? { Range: range } : {};

    const upstreamResponse = await fetch(metadata.streamUrl, {
      headers: upstreamHeaders,
    });

    if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
      return res.status(upstreamResponse.status).json(
        errorResponse("UPSTREAM_STREAM_ERROR", `Upstream returned status ${upstreamResponse.status}`)
      );
    }

    // Forward streaming headers for audio scrubbing/seeking
    res.status(upstreamResponse.status);
    const contentType = upstreamResponse.headers.get("content-type") || "audio/ogg";
    const contentLength = upstreamResponse.headers.get("content-length");
    const contentRange = upstreamResponse.headers.get("content-range");
    const acceptRanges = upstreamResponse.headers.get("accept-ranges") || "bytes";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Accept-Ranges", acceptRanges);
    if (contentLength) res.setHeader("Content-Length", contentLength);
    if (contentRange) res.setHeader("Content-Range", contentRange);

    // Pipe the response arrayBuffer/stream directly to Express response
    if (upstreamResponse.body) {
      const buffer = await upstreamResponse.arrayBuffer();
      res.send(Buffer.from(buffer));
    } else {
      res.end();
    }
  } catch (err) {
    logger.error("bff.stream_proxy_failed", { error: err.message });
    return res.status(502).json(errorResponse("STREAM_PROXY_FAILED", err.message));
  }
});

export default router;
