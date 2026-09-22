import { describe, expect, it, vi, beforeEach } from "vitest";
import { z } from "zod";
import jwt from "jsonwebtoken";

vi.mock("jsonwebtoken", () => ({
  default: {
    verify: vi.fn(),
  },
}));

import { AppError, errorHandler } from "../../src/middleware/errorHandler.js";
import { requireAuth, requireRole } from "../../src/middleware/auth.middleware.js";
import { validate } from "../../src/middleware/validate.middleware.js";
import { successResponse, errorResponse } from "../../src/utils/apiResponse.js";

describe("error handling and middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an AppError with the expected status and public metadata", () => {
    const error = new AppError("Forbidden.", 403, "FORBIDDEN");

    expect(error).toMatchObject({
      name: "AppError",
      status: 403,
      code: "FORBIDDEN",
      publicMessage: "Forbidden.",
    });
  });

  it("formats API errors into the shared response contract", () => {
    const req = {
      method: "POST",
      originalUrl: "/api/auth/login",
      user: { sub: "u-1" },
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    errorHandler(new AppError("Invalid credentials.", 401, "AUTH_FAILED"), req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        data: null,
        error: {
          code: "AUTH_FAILED",
          message: "Invalid credentials.",
        },
      }),
    );
  });

  it("normalizes Prisma-style conflict and validation errors", () => {
    const req = {
      method: "POST",
      originalUrl: "/api/auth/signup",
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    errorHandler({ code: "P2002", message: "duplicate" }, req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(409);

    errorHandler({ name: "ZodError", message: "bad" }, req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("reuses the API contract helpers for successful and failed payloads", () => {
    expect(successResponse({ ok: true })).toMatchObject({
      success: true,
      data: { ok: true },
      error: null,
    });

    expect(errorResponse("AUTH_INVALID", "Token expired.")).toMatchObject({
      success: false,
      error: {
        code: "AUTH_INVALID",
        message: "Token expired.",
      },
    });
  });

  it("validates DTO input and forwards zod failures as AppError", () => {
    const req = {
      body: { email: "bad-email" },
    };
    const next = vi.fn();

    validate(z.object({ email: z.string().email() }))(req, null, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0].code).toBe("VALIDATION_ERROR");
  });

  it("requires an Authorization header and a valid JWT", () => {
    const next = vi.fn();
    const req = { headers: {} };

    requireAuth(req, null, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: "AUTH_REQUIRED" }));

    req.headers = { authorization: "Bearer invalid-token" };
    jwt.verify.mockImplementation(() => {
      throw new Error("Expired");
    });
    requireAuth(req, null, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: "AUTH_INVALID" }));

    jwt.verify.mockReturnValue({ sub: "u-1", role: "ADMIN" });
    req.headers = { authorization: "Bearer valid-token" };
    const okReq = { headers: { authorization: "Bearer valid-token" } };
    requireAuth(okReq, null, next);
    expect(okReq.user).toMatchObject({ sub: "u-1", role: "ADMIN" });
  });

  it("enforces role-based access for admin-only routes", () => {
    const next = vi.fn();
    const req = { user: { role: "STUDENT" } };

    requireRole("ADMIN")(req, null, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: "FORBIDDEN" }));

    req.user = { role: "ADMIN" };
    requireRole("ADMIN")(req, null, next);
    expect(next).toHaveBeenCalledTimes(2);
  });
});
