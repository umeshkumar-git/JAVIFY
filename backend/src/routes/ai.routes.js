import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { analyzeSubmission } from "../services/ai.service.js";

const router = Router();

router.post(
  "/analyze",
  requireAuth,
  validate(
    z.object({
      code: z.string().min(1).max(20000),
      challengeId: z.string().uuid().optional(),
      type: z.enum(["hint", "explanation", "improve", "suggestion"]).default("hint"),
    })
  ),
  async (req, res, next) => {
    try {
      const analysis = await analyzeSubmission({
        userId: req.user.sub,
        challengeId: req.body.challengeId,
        code: req.body.code,
        requestedType: req.body.type,
      });
      res.json(analysis);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
