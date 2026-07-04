import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { prisma } from "../utils/prisma.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const challenges = await prisma.challenge.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        difficulty: true,
        category: true,
        xpReward: true,
        coinsReward: true,
        visibleTestCases: true,
        constraints: true,
        memoryLimit: true,
        timeLimit: true,
        starterCode: true,
        worldId: true,
      },
    });
    res.json(challenges);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const challenge = await prisma.challenge.findUnique({ where: { id: req.params.id } });
    if (!challenge) return res.status(404).json({ error: "Challenge not found" });
    const { hiddenTestCases: _hidden, ...safe } = challenge;
    res.json(safe);
  } catch (err) {
    next(err);
  }
});

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
    })
  ),
  async (req, res, next) => {
    try {
      const created = await prisma.challenge.create({ data: req.body });
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "MODERATOR"),
  async (req, res, next) => {
    try {
      const updated = await prisma.challenge.update({
        where: { id: req.params.id },
        data: req.body,
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

router.delete("/:id", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    await prisma.challenge.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
