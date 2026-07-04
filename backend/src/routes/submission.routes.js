import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { prisma } from "../utils/prisma.js";
import { judgeSubmission } from "../services/judge.service.js";

const router = Router();

router.post(
  "/",
  requireAuth,
  validate(
    z.object({
      challengeId: z.string().uuid(),
      code: z.string().min(1).max(20000),
      language: z.string().default("java"),
    })
  ),
  async (req, res, next) => {
    try {
      const challenge = await prisma.challenge.findUnique({
        where: { id: req.body.challengeId },
      });
      if (!challenge) return res.status(404).json({ error: "Challenge not found" });

      const judgement = await judgeSubmission({
        code: req.body.code,
        testCases: [
          ...(challenge.visibleTestCases ?? []),
          ...(challenge.hiddenTestCases ?? []),
        ],
        memoryLimit: challenge.memoryLimit,
        timeLimit: challenge.timeLimit,
      });

      const submission = await prisma.submission.create({
        data: {
          userId: req.user.sub,
          challengeId: challenge.id,
          code: req.body.code,
          language: req.body.language,
          result: judgement.result,
          score: judgement.score,
          passedTests: judgement.passedTests,
          totalTests: judgement.totalTests,
          executionTime: judgement.executionTime,
          memoryUsage: judgement.memoryUsage,
        },
      });

      // Award XP/coins on passing
      if (judgement.result === "PASSED") {
        await prisma.user.update({
          where: { id: req.user.sub },
          data: {
            xp: { increment: challenge.xpReward },
            coins: { increment: challenge.coinsReward },
          },
        });
      }

      res.json({ submission, judgement });
    } catch (err) {
      next(err);
    }
  }
);

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const submissions = await prisma.submission.findMany({
      where: { userId: req.user.sub },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { challenge: { select: { title: true, difficulty: true } } },
    });
    res.json(submissions);
  } catch (err) {
    next(err);
  }
});

export default router;
