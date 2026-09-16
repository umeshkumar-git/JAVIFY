import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { challengeController } from "../controllers/challenge.controller.js";

const router = Router();

router.get("/", challengeController.list);
router.get("/:id", challengeController.getById);

router.post(
	"/",
	requireAuth,
	requireRole("ADMIN", "MODERATOR"),
	validate(
		z.object({
			title: z.string().min(3).max(140),
			description: z.string().min(10),
			difficulty: z.enum(["NOVICE", "SKILLED", "ELITE", "BOSS"]),
			category: z.string().min(2),
			xpReward: z.number().int().positive().default(100),
			coinsReward: z.number().int().nonnegative().default(50),
			visibleTestCases: z.array(z.any()),
			hiddenTestCases: z.array(z.any()),
			constraints: z.string().optional(),
			memoryLimit: z.number().int().positive().default(256),
			timeLimit: z.number().int().positive().default(4000),
			starterCode: z.string(),
			expectedOutput: z.string().optional(),
			worldId: z.string().optional(),
		}),
	),
	challengeController.create,
);

router.patch(
	"/:id",
	requireAuth,
	requireRole("ADMIN", "MODERATOR"),
	challengeController.update,
);

router.delete(
	"/:id",
	requireAuth,
	requireRole("ADMIN"),
	challengeController.destroy,
);

export default router;
