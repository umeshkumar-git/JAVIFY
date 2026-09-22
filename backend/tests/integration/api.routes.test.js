import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/services/auth.service.js", () => ({
  registerUser: vi.fn(),
  loginUser: vi.fn(),
  refreshSession: vi.fn(),
  logoutSession: vi.fn(),
  requestOtp: vi.fn(),
  verifyOtp: vi.fn(),
}));

vi.mock("../../src/services/user.service.js", () => ({
  getCurrentUser: vi.fn(),
  updateCurrentUser: vi.fn(),
  getUserProgress: vi.fn(),
  listUsers: vi.fn(),
}));

vi.mock("../../src/services/challenge.service.js", () => ({
  listChallenges: vi.fn(),
  getChallengeById: vi.fn(),
  createChallenge: vi.fn(),
  updateChallenge: vi.fn(),
  deleteChallenge: vi.fn(),
}));

vi.mock("../../src/middleware/errorHandler.js", async () => {
  const actual = await vi.importActual("../../src/middleware/errorHandler.js");
  return {
    ...actual,
    errorHandler: actual.errorHandler,
  };
});

vi.mock("jsonwebtoken", () => ({
  default: {
    verify: vi.fn(() => ({ sub: "user-1", role: "ADMIN" })),
  },
}));

import authRoutes from "../../src/routes/auth.routes.js";
import userRoutes from "../../src/routes/user.routes.js";
import challengeRoutes from "../../src/routes/challenge.routes.js";
import { errorHandler } from "../../src/middleware/errorHandler.js";
import { registerUser, requestOtp, verifyOtp } from "../../src/services/auth.service.js";
import { getCurrentUser, listUsers } from "../../src/services/user.service.js";
import { createChallenge, listChallenges } from "../../src/services/challenge.service.js";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/challenges", challengeRoutes);
  app.use(errorHandler);
  return app;
}

describe("http routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a user session through the signup route", async () => {
    registerUser.mockResolvedValue({
      accessToken: "token-1",
      refreshToken: "token-2",
      user: { id: "user-1", email: "alice@example.com" },
    });

    const response = await request(makeApp())
      .post("/api/auth/signup")
      .send({
        name: "Alice",
        email: "alice@example.com",
        password: "securePass123",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe("alice@example.com");
  });

  it("reuses validation middleware for invalid auth payloads", async () => {
    const response = await request(makeApp())
      .post("/api/auth/login")
      .send({ email: "not-an-email", password: "" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns the authenticated user profile from the /me endpoint", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user-1",
      name: "Alice",
      email: "alice@example.com",
    });

    const response = await request(makeApp())
      .get("/api/users/me")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ id: "user-1", email: "alice@example.com" });
  });

  it("lists users for admins through the protected listing route", async () => {
    listUsers.mockResolvedValue([
      { id: "user-1", name: "Alice", email: "alice@example.com" },
    ]);

    const response = await request(makeApp())
      .get("/api/users/")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
  });

  it("lists and creates challenges through the public and admin endpoints", async () => {
    listChallenges.mockResolvedValue([
      { id: "c-1", title: "Array basics", category: "arrays" },
    ]);

    const listResponse = await request(makeApp()).get("/api/challenges");
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);

    createChallenge.mockResolvedValue({
      id: "c-2",
      title: "Loops",
      category: "loops",
    });

    const createResponse = await request(makeApp())
      .post("/api/challenges")
      .set("Authorization", "Bearer valid-token")
      .send({
        title: "Loops",
        description: "Practice loop control flow",
        difficulty: "NOVICE",
        category: "loops",
        visibleTestCases: [],
        hiddenTestCases: [],
        starterCode: "public class Main {}",
        memoryLimit: 256,
        timeLimit: 4000,
        xpReward: 100,
        coinsReward: 50,
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.title).toBe("Loops");
  });

  it("supports OTP request and verification handlers", async () => {
    requestOtp.mockResolvedValue({
      expiresAt: new Date(Date.now() + 300000),
      message: "Verification code sent to your email.",
    });

    const otpResponse = await request(makeApp())
      .post("/api/auth/send-otp")
      .send({ email: "alice@example.com", purpose: "register" });

    expect(otpResponse.status).toBe(200);
    expect(otpResponse.body.data.message).toContain("Verification code");

    verifyOtp.mockResolvedValue({ ok: true });
    const verifyResponse = await request(makeApp())
      .post("/api/auth/verify-otp")
      .send({ email: "alice@example.com", code: "123456", purpose: "register" });

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.data.ok).toBe(true);
  });
});
