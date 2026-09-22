import { redisClient, isCacheEnabled } from "../utils/cache.js";
import logger from "../utils/logger.js";
import { errorResponse } from "../utils/apiResponse.js";

/**
 * In-memory fallback map for when Redis is offline or disabled.
 * Map<key, number[]>
 */
const memoryWindows = new Map();

/**
 * Creates a distributed sliding-window rate limiter middleware.
 * @param {Object} options
 * @param {number} options.windowMs - Sliding window duration in milliseconds (default: 60,000 = 1 min)
 * @param {number} options.max - Maximum requests allowed per window (default: 100)
 * @param {string} [options.keyPrefix] - Prefix for Redis keys
 * @param {(req: import('express').Request) => string} [options.keyGenerator] - Custom key generator
 */
export function createRedisRateLimiter({
  windowMs = 60 * 1000,
  max = 100,
  keyPrefix = "rl",
  keyGenerator = (req) => req.ip || req.headers["x-forwarded-for"] || "127.0.0.1",
} = {}) {
  return async function redisRateLimiter(req, res, next) {
    const identifier = keyGenerator(req);
    const key = `${keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      const redisAvailable = await isCacheEnabled();

      if (redisAvailable) {
        // Multi-command atomic pipeline:
        // 1. Remove expired timestamps outside sliding window
        // 2. Add current request timestamp
        // 3. Count total active timestamps within window
        // 4. Set TTL on the key
        const multi = redisClient.multi();
        multi.zRemRangeByScore(key, 0, windowStart);
        multi.zAdd(key, { score: now, value: `${now}:${Math.random().toString(36).substring(7)}` });
        multi.zCard(key);
        multi.expire(key, Math.ceil(windowMs / 1000));

        const results = await multi.exec();
        const requestCount = results[2]; // ZCARD result

        const remaining = Math.max(0, max - requestCount);
        const resetSeconds = Math.ceil(windowMs / 1000);

        res.setHeader("X-RateLimit-Limit", max);
        res.setHeader("X-RateLimit-Remaining", remaining);
        res.setHeader("X-RateLimit-Reset", resetSeconds);

        if (requestCount > max) {
          res.setHeader("Retry-After", resetSeconds);
          logger.warn("rate_limit.exceeded", {
            ip: identifier,
            key,
            requestCount,
            max,
          });

          return res.status(429).json(
            errorResponse(
              "RATE_LIMIT_EXCEEDED",
              `Rate limit of ${max} requests per ${windowMs / 1000}s exceeded. Try again in ${resetSeconds}s.`
            )
          );
        }

        return next();
      }

      // Fallback: In-memory sliding window
      let timestamps = memoryWindows.get(key) || [];
      timestamps = timestamps.filter((t) => t > windowStart);
      timestamps.push(now);
      memoryWindows.set(key, timestamps);

      const remaining = Math.max(0, max - timestamps.length);
      const resetSeconds = Math.ceil(windowMs / 1000);

      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", remaining);
      res.setHeader("X-RateLimit-Reset", resetSeconds);

      if (timestamps.length > max) {
        res.setHeader("Retry-After", resetSeconds);
        return res.status(429).json(
          errorResponse(
            "RATE_LIMIT_EXCEEDED",
            `Rate limit of ${max} requests per ${windowMs / 1000}s exceeded. Try again in ${resetSeconds}s.`
          )
        );
      }

      return next();
    } catch (error) {
      logger.error("rate_limit.error_fail_open", {
        key,
        error: error.message,
      });
      // Fail-open principle: Do not block user traffic if rate-limiter infrastructure errors
      return next();
    }
  };
}
