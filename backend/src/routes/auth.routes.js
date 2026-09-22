/**
 * @openapi
 * /api/auth/signup:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       201:
 *         description: The user account and JWT session were created.
 */
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { validate } from "../middleware/validate.middleware.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { authController } from "../controllers/auth.controller.js";

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
		}),
	),
	authController.signup,
);

router.post(
	"/login",
	strictLimiter,
	validate(
		z.object({
			email: z.string().email(),
			password: z.string().min(1),
		}),
	),
	authController.login,
);

router.post("/refresh", authController.refresh);
router.post("/logout", requireAuth, authController.logout);

router.post(
	"/send-otp",
	strictLimiter,
	validate(
		z.object({
			email: z.string().email(),
			purpose: z.enum(["register", "password-reset"]).default("register"),
		}),
	),
	authController.requestOtpCode,
);

router.post(
	"/verify-otp",
	strictLimiter,
	validate(
		z.object({
			email: z.string().email(),
			code: z.string().length(6),
			purpose: z.enum(["register", "password-reset"]).default("register"),
		}),
	),
	authController.verifyOtpCode,
);

export default router;
