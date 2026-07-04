import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { prisma } from "../utils/prisma.js";
import { sanitizeUser } from "../services/auth.service.js";

const router = Router();

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(sanitizeUser(user));
  } catch (err) {
    next(err);
  }
});

router.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const { name, avatar } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.user.sub },
      data: { name, avatar },
    });
    res.json(sanitizeUser(updated));
  } catch (err) {
    next(err);
  }
});

router.get("/me/progress", requireAuth, async (req, res, next) => {
  try {
    const [user, completed, submissions] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.user.sub } }),
      prisma.submission.findMany({
        where: { userId: req.user.sub, result: "PASSED" },
        select: { challengeId: true },
        distinct: ["challengeId"],
      }),
      prisma.submission.count({ where: { userId: req.user.sub } }),
    ]);
    res.json({
      user: sanitizeUser(user),
      completedChallengeIds: completed.map((c) => c.challengeId),
      totalSubmissions: submissions,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/", requireAuth, requireRole("ADMIN"), async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { xp: "desc" },
      take: 100,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        xp: true,
        level: true,
        coins: true,
        streak: true,
        createdAt: true,
      },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

export default router;
