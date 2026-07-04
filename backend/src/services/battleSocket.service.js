import logger from "../utils/logger.js";
import { prisma } from "../utils/prisma.js";

/**
 * Real-time multiplayer battle socket layer.
 * Each battle has a room: `battle:<id>`.
 */
export function registerBattleSocket(io) {
  io.on("connection", (socket) => {
    logger.info("battle.socket.connect", { id: socket.id });

    socket.on("battle:join", ({ battleId, userId }) => {
      socket.join(`battle:${battleId}`);
      io.to(`battle:${battleId}`).emit("battle:event", {
        type: "joined",
        userId,
        at: Date.now(),
      });
    });

    socket.on("battle:progress", ({ battleId, userId, progress }) => {
      io.to(`battle:${battleId}`).emit("battle:event", {
        type: "progress",
        userId,
        progress,
        at: Date.now(),
      });
    });

    socket.on("battle:complete", async ({ battleId, userId }) => {
      try {
        const battle = await prisma.battle.findUnique({ where: { id: battleId } });
        if (!battle || battle.status !== "IN_PROGRESS") return;
        await prisma.battle.update({
          where: { id: battleId },
          data: { winnerId: userId, status: "COMPLETED", endedAt: new Date() },
        });
        await prisma.user.update({
          where: { id: userId },
          data: { xp: { increment: 50 }, coins: { increment: 100 } },
        });
        io.to(`battle:${battleId}`).emit("battle:event", {
          type: "completed",
          winnerId: userId,
          rewards: { xp: 50, coins: 100 },
          at: Date.now(),
        });
      } catch (error) {
        logger.error("battle:complete failed", { error: error.message });
      }
    });

    socket.on("disconnect", () => {
      logger.info("battle.socket.disconnect", { id: socket.id });
    });
  });
}
