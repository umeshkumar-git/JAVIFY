import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRedisRateLimiter } from "../../src/middleware/redisRateLimiter.js";

describe("createRedisRateLimiter (Distributed Sliding-Window Rate Limiter)", () => {
  let mockReq;
  let mockRes;
  let nextFn;

  beforeEach(() => {
    mockReq = {
      ip: "192.168.1.42",
      headers: {},
    };
    mockRes = {
      statusCode: 200,
      headers: {},
      setHeader: vi.fn((k, v) => {
        mockRes.headers[k] = v;
      }),
      status: vi.fn((code) => {
        mockRes.statusCode = code;
        return mockRes;
      }),
      json: vi.fn((data) => data),
    };
    nextFn = vi.fn();
  });

  it("permits requests within allowed threshold and sets rate limit headers", async () => {
    const limiter = createRedisRateLimiter({
      windowMs: 60000,
      max: 5,
      keyPrefix: "test_rl_allow",
      keyGenerator: () => "test_user_allow",
    });

    await limiter(mockReq, mockRes, nextFn);

    expect(nextFn).toHaveBeenCalled();
    expect(mockRes.setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", 5);
    expect(mockRes.headers["X-RateLimit-Remaining"]).toBe(4);
  });

  it("blocks requests exceeding threshold with HTTP 429 and Retry-After", async () => {
    const key = "test_user_block";
    const limiter = createRedisRateLimiter({
      windowMs: 60000,
      max: 2,
      keyPrefix: "test_rl_block",
      keyGenerator: () => key,
    });

    // Request 1: Allowed
    await limiter(mockReq, mockRes, nextFn);
    expect(nextFn).toHaveBeenCalledTimes(1);

    // Request 2: Allowed
    await limiter(mockReq, mockRes, nextFn);
    expect(nextFn).toHaveBeenCalledTimes(2);

    // Request 3: Blocked (exceeds limit 2)
    await limiter(mockReq, mockRes, nextFn);
    expect(nextFn).toHaveBeenCalledTimes(2); // Did not call next
    expect(mockRes.statusCode).toBe(429);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: "RATE_LIMIT_EXCEEDED",
        }),
      })
    );
    expect(mockRes.setHeader).toHaveBeenCalledWith("Retry-After", expect.any(Number));
  });
});
