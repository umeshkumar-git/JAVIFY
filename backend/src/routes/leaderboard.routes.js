import { Router } from "express";
import { prisma } from "../utils/prisma.js";

const router = Router();

/**
 * Multi-period leaderboards:
 *   /leaderboard?period=weekly|monthly|all-time
 */
router.get("/", async (req, res, next) => {
  try {
    const period = req.query.period ?? "all-time";
    const now = Date.now();
    const ranges = {
      weekly: now - 7 * 24 * 60 * 60 * 1000,
      monthly: now - 30 * 24 * 60 * 60 * 1000,
    };

    if (period === "all-time") {
      const users = await prisma.user.findMany({
        orderBy: { xp: "desc" },
        take: 50,
        select: { id: true, name: true, xp: true, level: true, coins: true, streak: true, avatar: true },
      });
      return res.json(users.map((u, i) => ({ rank: i + 1, ...u })));
    }

    const since = new Date(ranges[period]);
    const grouped = await prisma.submission.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: since }, result: "PASSED" },
      _sum: { score: true },
      orderBy: { _sum: { score: "desc" } },
      take: 50,
    });
    const userMap = await prisma.user.findMany({
      where: { id: { in: grouped.map((g) => g.userId) } },
      select: { id: true, name: true, level: true, avatar: true },
    });
    const byId = Object.fromEntries(userMap.map((u) => [u.id, u]));
    res.json(
      grouped.map((g, i) => ({
        rank: i + 1,
        userId: g.userId,
        score: g._sum.score ?? 0,
        ...byId[g.userId],
      }))
    );
  } catch (err) {
    next(err);
  }
});

export default router;
