import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { prisma } from "../utils/prisma.js";

const router = Router();

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const submissions = await prisma.submission.findMany({
      where: { userId: req.user.sub },
      include: { challenge: { select: { category: true, difficulty: true } } },
    });

    const stats = {};
    for (const s of submissions) {
      const cat = s.challenge.category;
      stats[cat] ??= { attempts: 0, passed: 0 };
      stats[cat].attempts += 1;
      if (s.result === "PASSED") stats[cat].passed += 1;
    }

    const weak = Object.entries(stats)
      .filter(([, v]) => v.passed / Math.max(v.attempts, 1) < 0.5)
      .map(([cat]) => cat);
    const strong = Object.entries(stats)
      .filter(([, v]) => v.passed / Math.max(v.attempts, 1) >= 0.8 && v.attempts >= 2)
      .map(([cat]) => cat);

    const suggestedChallenges = await prisma.challenge.findMany({
      where: weak.length ? { category: { in: weak } } : {},
      take: 5,
      orderBy: { difficulty: "asc" },
      select: { id: true, title: true, difficulty: true, category: true, xpReward: true },
    });

    const recommendation = await prisma.recommendation.create({
      data: {
        userId: req.user.sub,
        weakTopics: weak,
        strengths: strong,
        suggestedChallenges,
      },
    });

    res.json(recommendation);
  } catch (err) {
    next(err);
  }
});

export default router;
