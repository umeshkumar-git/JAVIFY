import logger from "../utils/logger.js";
import { getCachedValue, setCachedValue, deleteCachedKey } from "../utils/cache.js";

/**
 * In-memory room store with Redis sync backing.
 * Map<sessionId, SessionState>
 */
const activeSessions = new Map();

/**
 * High-resolution timestamp generator in milliseconds.
 */
function getPreciseTimeMs() {
  return Date.now();
}

/**
 * Retrieves session state from memory or Redis.
 */
async function getSessionState(sessionId) {
  if (activeSessions.has(sessionId)) {
    return activeSessions.get(sessionId);
  }

  // Attempt Redis hydration
  const cached = await getCachedValue(`session:${sessionId}`);
  if (cached) {
    activeSessions.set(sessionId, cached);
    return cached;
  }

  return null;
}

/**
 * Persists session state both in memory and Redis.
 */
async function saveSessionState(session) {
  activeSessions.set(session.sessionId, session);
  await setCachedValue(`session:${session.sessionId}`, session, 3600); // 1-hour TTL
}

/**
 * Removes session state.
 */
async function removeSession(sessionId) {
  activeSessions.delete(sessionId);
  await deleteCachedKey(`session:${sessionId}`);
}

/**
 * Registers the Collaborative Listen Together socket handlers.
 * @param {import("socket.io").Server} io
 */
export function registerSessionSyncSocket(io) {
  const sessionNamespace = io.of("/listen-together");

  sessionNamespace.on("connection", (socket) => {
    logger.info("session_sync.connected", { socketId: socket.id });

    // Track active session this socket has joined
    let currentSessionId = null;

    /**
     * 1. NTP-Style Clock Drift Ping-Pong
     * Client sends T1 (clientSendTime).
     * Server timestamps T2 (serverReceiveTime) and T3 (serverTransmitTime).
     */
    socket.on("sync:ping", ({ clientSendTime }) => {
      const serverReceiveTime = getPreciseTimeMs();
      const serverTransmitTime = getPreciseTimeMs();

      socket.emit("sync:pong", {
        clientSendTime,
        serverReceiveTime,
        serverTransmitTime,
      });
    });

    /**
     * 2. Create a Collaborative Session
     */
    socket.on("session:create", async ({ userId, username, initialTrack }, callback) => {
      try {
        const sessionId = `room_${Math.random().toString(36).substring(2, 9)}`;
        const now = getPreciseTimeMs();

        const session = {
          sessionId,
          hostId: userId || socket.id,
          hostSocketId: socket.id,
          currentTrack: initialTrack || {
            id: "demo_1",
            title: "Neon Horizon (Synthwave Odyssey)",
            artist: "Javify Soundlabs",
            duration: 215,
            url: "https://actions.google.com/sounds/v1/science_fiction/alien_spaceship_atmosphere.ogg",
          },
          status: "PAUSED", // 'PLAYING' | 'PAUSED' | 'STOPPED'
          positionMs: 0,
          serverTimestamp: now,
          seq: 1,
          participants: [
            {
              socketId: socket.id,
              userId: userId || socket.id,
              username: username || "Host Pioneer",
              joinedAt: now,
              isHost: true,
            },
          ],
        };

        await saveSessionState(session);
        currentSessionId = sessionId;
        socket.join(sessionId);

        logger.info("session_sync.created", { sessionId, hostSocketId: socket.id });

        if (typeof callback === "function") {
          callback({ success: true, session });
        }
      } catch (err) {
        logger.error("session_sync.create_failed", { error: err.message });
        if (typeof callback === "function") {
          callback({ success: false, error: err.message });
        }
      }
    });

    /**
     * 3. Join an Existing Collaborative Session
     */
    socket.on("session:join", async ({ sessionId, userId, username }, callback) => {
      try {
        const session = await getSessionState(sessionId);
        if (!session) {
          if (typeof callback === "function") {
            callback({ success: false, error: "SESSION_NOT_FOUND" });
          }
          return;
        }

        currentSessionId = sessionId;
        socket.join(sessionId);

        // Remove existing participant record if reconnected
        session.participants = session.participants.filter((p) => p.socketId !== socket.id && p.userId !== userId);

        const participant = {
          socketId: socket.id,
          userId: userId || socket.id,
          username: username || `Listener #${session.participants.length + 1}`,
          joinedAt: getPreciseTimeMs(),
          isHost: session.hostId === userId || session.hostSocketId === socket.id,
        };
        session.participants.push(participant);

        await saveSessionState(session);

        // Notify room of joined participant
        socket.to(sessionId).emit("session:participant-joined", {
          participant,
          participantsCount: session.participants.length,
        });

        logger.info("session_sync.joined", { sessionId, participant });

        if (typeof callback === "function") {
          callback({
            success: true,
            session,
            currentServerTime: getPreciseTimeMs(),
          });
        }
      } catch (err) {
        logger.error("session_sync.join_failed", { sessionId, error: err.message });
        if (typeof callback === "function") {
          callback({ success: false, error: err.message });
        }
      }
    });

    /**
     * 4. Broadcast Host Playback Action (Play, Pause, Seek, Track-Change)
     */
    socket.on("session:action", async ({ action, positionMs, track, clientTimestamp }, callback) => {
      try {
        if (!currentSessionId) return;
        const session = await getSessionState(currentSessionId);
        if (!session) return;

        // Security check: Only host can issue authoritative actions
        if (session.hostSocketId !== socket.id) {
          if (typeof callback === "function") {
            callback({ success: false, error: "UNAUTHORIZED_NOT_HOST" });
          }
          return;
        }

        const now = getPreciseTimeMs();
        session.seq += 1;
        session.serverTimestamp = now;

        if (action === "PLAY") {
          session.status = "PLAYING";
          session.positionMs = typeof positionMs === "number" ? Math.max(0, positionMs) : session.positionMs;
        } else if (action === "PAUSE") {
          session.status = "PAUSED";
          session.positionMs = typeof positionMs === "number" ? Math.max(0, positionMs) : session.positionMs;
        } else if (action === "SEEK") {
          session.positionMs = typeof positionMs === "number" ? Math.max(0, positionMs) : 0;
        } else if (action === "TRACK_CHANGE" && track) {
          session.currentTrack = track;
          session.positionMs = 0;
          session.status = "PLAYING";
        }

        await saveSessionState(session);

        // Broadcast synchronized action to all peers in the room
        sessionNamespace.to(currentSessionId).emit("session:sync", {
          action,
          status: session.status,
          positionMs: session.positionMs,
          currentTrack: session.currentTrack,
          serverTimestamp: now,
          seq: session.seq,
        });

        logger.info("session_sync.action_broadcast", {
          sessionId: currentSessionId,
          action,
          seq: session.seq,
          positionMs: session.positionMs,
        });

        if (typeof callback === "function") {
          callback({ success: true, seq: session.seq, serverTimestamp: now });
        }
      } catch (err) {
        logger.error("session_sync.action_failed", { error: err.message });
        if (typeof callback === "function") {
          callback({ success: false, error: err.message });
        }
      }
    });

    /**
     * 5. Explicit Host Transfer
     */
    socket.on("session:transfer-host", async ({ targetUserId, targetSocketId }, callback) => {
      try {
        if (!currentSessionId) return;
        const session = await getSessionState(currentSessionId);
        if (!session || session.hostSocketId !== socket.id) return;

        const target = session.participants.find(
          (p) => p.userId === targetUserId || p.socketId === targetSocketId
        );
        if (!target) return;

        session.participants.forEach((p) => {
          p.isHost = p.socketId === target.socketId;
        });
        session.hostId = target.userId;
        session.hostSocketId = target.socketId;

        await saveSessionState(session);

        sessionNamespace.to(currentSessionId).emit("session:host-changed", {
          newHostId: session.hostId,
          newHostSocketId: session.hostSocketId,
          participants: session.participants,
        });

        if (typeof callback === "function") callback({ success: true });
      } catch (err) {
        logger.error("session_sync.transfer_failed", { error: err.message });
      }
    });

    /**
     * 6. Disconnect & Automatic Host Election
     */
    socket.on("disconnect", async () => {
      logger.info("session_sync.disconnected", { socketId: socket.id, currentSessionId });
      if (!currentSessionId) return;

      try {
        const session = await getSessionState(currentSessionId);
        if (!session) return;

        const disconnectedParticipant = session.participants.find((p) => p.socketId === socket.id);
        session.participants = session.participants.filter((p) => p.socketId !== socket.id);

        if (session.participants.length === 0) {
          // Empty session teardown
          await removeSession(currentSessionId);
          logger.info("session_sync.teardown_empty", { sessionId: currentSessionId });
          return;
        }

        // Automatic Host Failover if the host disconnected
        if (session.hostSocketId === socket.id) {
          const nextHost = session.participants[0];
          nextHost.isHost = true;
          session.hostId = nextHost.userId;
          session.hostSocketId = nextHost.socketId;

          logger.info("session_sync.host_failover_elected", {
            sessionId: currentSessionId,
            newHostSocketId: nextHost.socketId,
            newHostUserId: nextHost.userId,
          });

          sessionNamespace.to(currentSessionId).emit("session:host-changed", {
            newHostId: session.hostId,
            newHostSocketId: session.hostSocketId,
            participants: session.participants,
            reason: "HOST_DISCONNECTED_AUTO_FAILOVER",
          });
        }

        await saveSessionState(session);

        sessionNamespace.to(currentSessionId).emit("session:participant-left", {
          socketId: socket.id,
          participant: disconnectedParticipant,
          participantsCount: session.participants.length,
        });
      } catch (err) {
        logger.error("session_sync.disconnect_cleanup_failed", { error: err.message });
      }
    });
  });
}
