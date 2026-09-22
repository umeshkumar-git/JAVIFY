import { Router } from "express";
import { getCatalog, tokenManager } from "../services/gatewayProxy.service.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";
import { createRedisRateLimiter } from "../middleware/redisRateLimiter.js";

const router = Router();

// Dedicated rate limiter for gateway routes (120 requests/min per IP)
const gatewayLimiter = createRedisRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  keyPrefix: "rl:gw",
});

router.use(gatewayLimiter);

/**
 * GET /api/gateway/tracks
 * Query params: limit, offset, scale (boolean)
 */
router.get("/tracks", (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || "50", 10), 1000);
    const offset = Math.max(0, parseInt(req.query.offset || "0", 10));
    const scale = req.query.scale === "true" || req.query.scale === "1";

    const result = getCatalog({ limit, offset, scale });
    res.json(successResponse(result));
  } catch (err) {
    res.status(500).json(errorResponse("CATALOG_ERROR", err.message));
  }
});

/**
 * GET /api/gateway/token
 * Obtains an active streaming token using mutex-protected distributed refresh
 */
router.get("/token", async (_req, res) => {
  try {
    const token = await tokenManager.getValidToken();
    res.json(
      successResponse({
        token,
        expiresIn: 3600,
        tokenType: "Bearer",
      })
    );
  } catch (err) {
    res.status(500).json(errorResponse("TOKEN_ERROR", err.message));
  }
});

export default router;
