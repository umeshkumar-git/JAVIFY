import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { prisma } from "../utils/prisma.js";

const router = Router();

router.post(
  "/",
  requireAuth,
  validate(z.object({ challengeId: z.string().uuid() })),
  async (req, res, next) => {
    try {
      const roomCode = crypto.randomBytes(3).toString("hex").toUpperCase();
      const battle = await prisma.battle.create({
        data: {
          roomCode,
          challengeId: req.body.challengeId,
          player1Id: req.user.sub,
        },
      });
      res.status(201).json(battle);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/join",
  requireAuth,
  validate(z.object({ roomCode: z.string() })),
  async (req, res, next) => {
    try {
      const battle = await prisma.battle.findUnique({
        where: { roomCode: req.body.roomCode.toUpperCase() },
      });
      if (!battle) return res.status(404).json({ error: "Room not found" });
      if (battle.status !== "WAITING") {
        return res.status(409).json({ error: "Room is no longer joinable" });
      }
      const updated = await prisma.battle.update({
        where: { id: battle.id },
        data: { player2Id: req.user.sub, status: "IN_PROGRESS", startedAt: new Date() },
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const battles = await prisma.battle.findMany({
      where: {
        OR: [{ player1Id: req.user.sub }, { player2Id: req.user.sub }],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    res.json(battles);
  } catch (err) {
    next(err);
  }
});

export default router;
