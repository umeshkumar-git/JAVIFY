import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { prisma } from "../utils/prisma.js";

const router = Router();

router.post("/visit", async (req, res, next) => {
  try {
    const { path, visitorId, sessionId, device, referrer } = req.body;
    await prisma.analytics.create({
      data: {
        userId: req.body.userId ?? null,
        visitorId,
        sessionId,
        path,
        device,
        referrer,
        ipAddress: req.ip,
      },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get("/overview", requireAuth, requireRole("ADMIN"), async (_req, res, next) => {
  try {
    const now = Date.now();
    const start = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const [total, today, week, unique, active, users] = await Promise.all([
      prisma.analytics.count(),
      prisma.analytics.count({
        where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
      prisma.analytics.count({ where: { createdAt: { gte: start } } }),
      prisma.analytics.findMany({
        distinct: ["visitorId"],
        select: { visitorId: true },
      }),
      prisma.analytics.findMany({
        where: { createdAt: { gte: new Date(now - 5 * 60 * 1000) } },
        distinct: ["visitorId"],
        select: { visitorId: true },
      }),
      prisma.user.count(),
    ]);

    res.json({
      totalPageViews: total,
      visitsToday: today,
      visitsThisWeek: week,
      uniqueVisitors: unique.length,
      activeNow: active.length,
      totalUsers: users,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const [visits, last] = await Promise.all([
      prisma.analytics.count({ where: { userId: req.user.sub } }),
      prisma.analytics.findFirst({
        where: { userId: req.user.sub },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, device: true, path: true },
      }),
    ]);
    res.json({
      totalVisits: visits,
      lastSeen: last?.createdAt ?? null,
      lastDevice: last?.device ?? null,
      lastPath: last?.path ?? null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
