import crypto from "crypto";
import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/repositories/auth.repository.js", () => ({
  authRepository: {
    invalidateOtpRequests: vi.fn(),
    createOtp: vi.fn(),
    findLatestOtp: vi.fn(),
    markOtpConsumed: vi.fn(),
    updateOtp: vi.fn(),
    findUserByEmail: vi.fn(),
    createUser: vi.fn(),
    createSession: vi.fn(),
    findSessionByRefreshToken: vi.fn(),
    findUserById: vi.fn(),
    deleteSessionsByRefreshToken: vi.fn(),
  },
}));

vi.mock("../../src/services/queue.service.js", () => ({
  enqueueOtpEmail: vi.fn(),
}));

vi.mock("../../src/utils/logger.js", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../src/services/token.service.js", () => ({
  signAccessToken: vi.fn(() => "access-token"),
  signRefreshToken: vi.fn(() => "refresh-token"),
  verifyRefreshToken: vi.fn(() => ({ sub: "user-1" })),
}));

import { authRepository } from "../../src/repositories/auth.repository.js";
import { enqueueOtpEmail } from "../../src/services/queue.service.js";
import {
  loginUser,
  logoutSession,
  refreshSession,
  registerUser,
  requestOtp,
  verifyOtp,
} from "../../src/services/auth.service.js";

function hashCode(email, code) {
  return crypto.createHash("sha256").update(`${email}:${code}`).digest("hex");
}

describe("auth.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests an OTP and enqueues the email delivery job", async () => {
    authRepository.invalidateOtpRequests.mockResolvedValue(true);
    authRepository.createOtp.mockResolvedValue({ id: "otp-123" });

    const result = await requestOtp("  Test@Example.com  ", "register");

    expect(authRepository.invalidateOtpRequests).toHaveBeenCalledWith(
      "test@example.com",
      "register",
    );
    expect(authRepository.createOtp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "test@example.com",
        purpose: "register",
        expiresAt: expect.any(Date),
      }),
    );
    expect(enqueueOtpEmail).toHaveBeenCalledWith(
      "test@example.com",
      expect.any(String),
    );
    expect(result.message).toBe("Verification code sent to your email.");
  });

  it("rejects when no OTP request exists", async () => {
    authRepository.findLatestOtp.mockResolvedValue(null);

    await expect(verifyOtp("test@example.com", "123456")).rejects.toMatchObject({
      code: "OTP_MISSING",
      status: 400,
    });
  });

  it("rejects expired OTPs and marks them consumed", async () => {
    authRepository.findLatestOtp.mockResolvedValue({
      id: "otp-expired",
      attempts: 0,
      expiresAt: new Date(Date.now() - 1000),
      codeHash: hashCode("test@example.com", "123456"),
    });

    await expect(verifyOtp("test@example.com", "123456")).rejects.toMatchObject({
      code: "OTP_EXPIRED",
      status: 400,
    });
    expect(authRepository.markOtpConsumed).toHaveBeenCalledWith("otp-expired");
  });

  it("rejects invalid OTPs and increments the attempt counter", async () => {
    authRepository.findLatestOtp.mockResolvedValue({
      id: "otp-invalid",
      attempts: 2,
      expiresAt: new Date(Date.now() + 60000),
      codeHash: hashCode("test@example.com", "654321"),
    });

    await expect(verifyOtp("test@example.com", "123456")).rejects.toMatchObject({
      code: "OTP_INVALID",
      status: 400,
    });
    expect(authRepository.updateOtp).toHaveBeenCalledWith("otp-invalid", {
      attempts: 3,
    });
  });

  it("verifies a valid OTP and marks it consumed", async () => {
    authRepository.findLatestOtp.mockResolvedValue({
      id: "otp-valid",
      attempts: 0,
      expiresAt: new Date(Date.now() + 60000),
      codeHash: hashCode("test@example.com", "123456"),
    });

    await expect(verifyOtp("test@example.com", "123456")).resolves.toEqual({ ok: true });
    expect(authRepository.markOtpConsumed).toHaveBeenCalledWith("otp-valid");
  });

  it("rejects duplicate registrations", async () => {
    authRepository.findUserByEmail.mockResolvedValue({ id: "user-1" });

    await expect(
      registerUser({
        name: "Alice",
        email: "alice@example.com",
        password: "safePass123",
      }),
    ).rejects.toMatchObject({ code: "EMAIL_TAKEN", status: 409 });
  });

  it("logs a user in with valid credentials", async () => {
    const hashedPassword = await bcrypt.hash("safePass123", 12);
    authRepository.findUserByEmail.mockResolvedValue({
      id: "user-1",
      name: "Alice",
      email: "alice@example.com",
      password: hashedPassword,
      role: "STUDENT",
    });

    const session = await loginUser({
      email: "alice@example.com",
      password: "safePass123",
    });

    expect(session).toMatchObject({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      user: { id: "user-1", email: "alice@example.com" },
    });
    expect(authRepository.createSession).toHaveBeenCalled();
  });

  it("refreshes a valid session and returns a fresh access token", async () => {
    const future = new Date(Date.now() + 60_000);
    authRepository.findSessionByRefreshToken.mockResolvedValue({
      userId: "user-1",
      expiresAt: future,
    });
    authRepository.findUserById.mockResolvedValue({
      id: "user-1",
      name: "Alice",
      email: "alice@example.com",
      role: "STUDENT",
    });

    const result = await refreshSession("refresh-token");

    expect(result).toMatchObject({
      accessToken: "access-token",
      user: { id: "user-1", email: "alice@example.com" },
    });
  });

  it("throws a clear error for invalid login credentials", async () => {
    authRepository.findUserByEmail.mockResolvedValue(null);

    await expect(
      loginUser({ email: "alice@example.com", password: "wrong-pass" }),
    ).rejects.toMatchObject({ code: "AUTH_FAILED", status: 401 });
  });

  it("revokes a refresh token during logout", async () => {
    await expect(logoutSession("refresh-token")).resolves.toBeUndefined();
    expect(authRepository.deleteSessionsByRefreshToken).toHaveBeenCalledWith(
      "refresh-token",
    );
  });
});
