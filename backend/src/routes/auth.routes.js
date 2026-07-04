import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { validate } from "../middleware/validate.middleware.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  registerUser,
  loginUser,
  refreshSession,
  logoutSession,
  requestOtp,
  verifyOtp,
} from "../services/auth.service.js";

const router = Router();
const strictLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });

router.post(
  "/signup",
  strictLimiter,
  validate(
    z.object({
      name: z.string().min(2).max(50),
      email: z.string().email(),
      password: z.string().min(8).max(128),
    })
  ),
  async (req, res, next) => {
    try {
      const session = await registerUser(req.body);
      res.status(201).json(session);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/login",
  strictLimiter,
  validate(
    z.object({
      email: z.string().email(),
      password: z.string().min(1),
    })
  ),
  async (req, res, next) => {
    try {
      res.json(await loginUser(req.body));
    } catch (err) {
      next(err);
    }
  }
);

router.post("/refresh", async (req, res, next) => {
  try {
    res.json(await refreshSession(req.body.refreshToken));
  } catch (err) {
    next(err);
  }
});

router.post("/logout", requireAuth, async (req, res, next) => {
  try {
    await logoutSession(req.body.refreshToken);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/send-otp",
  strictLimiter,
  validate(
    z.object({
      email: z.string().email(),
      purpose: z.enum(["register", "password-reset"]).default("register"),
    })
  ),
  async (req, res, next) => {
    try {
      res.json(await requestOtp(req.body.email, req.body.purpose));
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/verify-otp",
  strictLimiter,
  validate(
    z.object({
      email: z.string().email(),
      code: z.string().length(6),
      purpose: z.enum(["register", "password-reset"]).default("register"),
    })
  ),
  async (req, res, next) => {
    try {
      res.json(await verifyOtp(req.body.email, req.body.code, req.body.purpose));
    } catch (err) {
      next(err);
    }
  }
);

export default router;
