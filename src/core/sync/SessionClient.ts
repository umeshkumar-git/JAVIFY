import { io, Socket } from "socket.io-client";
import { ClockSync, ClockSyncMetrics } from "./ClockSync";
import { DriftCompensator, DriftDiagnosis, AudioControlTarget } from "./DriftCompensator";
import { AudioTrack } from "../audio/AudioPipeline";

export interface SocketServerResponse<T = unknown> {
  success: boolean;
  session?: SessionData;
  error?: string;
  data?: T;
}

export interface Participant {
  socketId: string;
  userId: string;
  username: string;
  joinedAt: number;
  isHost: boolean;
}

export interface SessionData {
  sessionId: string;
  hostId: string;
  hostSocketId: string;
  currentTrack: {
    id: string;
    title: string;
    artist: string;
    duration: number;
    url: string;
    coverUrl?: string;
  };
  status: "PLAYING" | "PAUSED" | "STOPPED";
  positionMs: number;
  serverTimestamp: number;
  seq: number;
  participants: Participant[];
}

export interface SessionClientEvents {
  onSessionJoined: (session: SessionData, isHost: boolean) => void;
  onSessionLeft: () => void;
  onParticipantUpdate: (participants: Participant[]) => void;
  onHostChanged: (newHostId: string, isMe: boolean) => void;
  onSyncDiagnosis: (diagnosis: DriftDiagnosis) => void;
  onMetricsUpdate: (metrics: ClockSyncMetrics) => void;
  onConnectionStatusChange: (status: "CONNECTED" | "CONNECTING" | "DISCONNECTED" | "RECONNECTING") => void;
}

/**
 * Enterprise Real-time Collaborative Session Client ("Listen Together").
 * Handles Socket.IO connection, exponential backoff, clock sync calibration,
 * and automated audio drift compensation.
 */
export class SessionClient {
  private socket: Socket | null = null;
  private clockSync: ClockSync | null = null;
  private driftCompensator: DriftCompensator | null = null;
  private currentSession: SessionData | null = null;
  private isHost = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 8;

  constructor(
    private readonly serverUrl: string = "http://localhost:4000",
    private readonly audioControl: AudioControlTarget,
    private readonly listeners: Partial<SessionClientEvents> = {}
  ) {}

  public connect(): void {
    if (this.socket && this.socket.connected) return;

    this.listeners.onConnectionStatusChange?.("CONNECTING");

    this.socket = io(`${this.serverUrl}/listen-together`, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
    });

    // Initialize NTP Clock Sync over Socket.io
    this.clockSync = new ClockSync(
      ({ clientSendTime }) =>
        new Promise((resolve, reject) => {
          if (!this.socket || !this.socket.connected) {
            return reject(new Error("Socket disconnected"));
          }
          this.socket.timeout(3000).emit(
            "sync:ping",
            { clientSendTime },
            (err: unknown, response: { clientSendTime: number; serverReceiveTime: number; serverTransmitTime: number }) => {
              if (err) reject(err);
              else resolve(response);
            }
          );
        }),
      8,
      45000
    );

    // Initialize Drift Compensator
    this.driftCompensator = new DriftCompensator(this.audioControl, this.clockSync, (diagnosis) => {
      this.listeners.onSyncDiagnosis?.(diagnosis);
    });

    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    if (!this.socket) return;

    this.socket.on("connect", async () => {
      this.reconnectAttempts = 0;
      this.listeners.onConnectionStatusChange?.("CONNECTED");

      // Calibrate NTP clock immediately upon connection
      if (this.clockSync) {
        try {
          const metrics = await this.clockSync.calibrate();
          this.listeners.onMetricsUpdate?.(metrics);
        } catch (e) {
          // Clock calibration failover
        }
      }
    });

    this.socket.on("disconnect", () => {
      this.listeners.onConnectionStatusChange?.("DISCONNECTED");
      this.driftCompensator?.stopPeriodicCheck();
    });

    this.socket.on("connect_error", () => {
      this.reconnectAttempts++;
      this.listeners.onConnectionStatusChange?.("RECONNECTING");
    });

    // Remote playback synchronization event
    this.socket.on("session:sync", (syncPayload) => {
      if (!this.currentSession) return;

      this.currentSession.status = syncPayload.status;
      this.currentSession.positionMs = syncPayload.positionMs;
      this.currentSession.serverTimestamp = syncPayload.serverTimestamp;
      this.currentSession.seq = syncPayload.seq;
      if (syncPayload.currentTrack) {
        this.currentSession.currentTrack = syncPayload.currentTrack;
      }

      // Reconcile client audio state if listener
      if (!this.isHost && this.driftCompensator) {
        this.driftCompensator.reconcile(syncPayload);
      }
    });

    this.socket.on("session:participant-joined", ({ participant }) => {
      if (this.currentSession) {
        this.currentSession.participants = this.currentSession.participants.filter(
          (p) => p.socketId !== participant.socketId
        );
        this.currentSession.participants.push(participant);
        this.listeners.onParticipantUpdate?.(this.currentSession.participants);
      }
    });

    this.socket.on("session:participant-left", ({ socketId }) => {
      if (this.currentSession) {
        this.currentSession.participants = this.currentSession.participants.filter(
          (p) => p.socketId !== socketId
        );
        this.listeners.onParticipantUpdate?.(this.currentSession.participants);
      }
    });

    this.socket.on("session:host-changed", ({ newHostId, newHostSocketId, participants }) => {
      if (this.currentSession) {
        this.currentSession.hostId = newHostId;
        this.currentSession.hostSocketId = newHostSocketId;
        if (participants) this.currentSession.participants = participants;

        const isMeHost = this.socket?.id === newHostSocketId;
        this.isHost = isMeHost;

        if (this.isHost) {
          this.driftCompensator?.stopPeriodicCheck();
          this.audioControl.setPlaybackRate(1.0);
        } else {
          this.driftCompensator?.startPeriodicCheck();
        }

        this.listeners.onHostChanged?.(newHostId, isMeHost);
        this.listeners.onParticipantUpdate?.(this.currentSession.participants);
      }
    });
  }

  public async createSession(userId: string, username: string, initialTrack?: AudioTrack | null): Promise<SessionData> {
    this.connect();
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error("Socket not initialized"));

      this.socket.emit("session:create", { userId, username, initialTrack }, (res: SocketServerResponse) => {
        if (!res || !res.success || !res.session) {
          return reject(new Error(res?.error || "Failed to create session"));
        }

        this.currentSession = res.session;
        this.isHost = true;
        this.listeners.onSessionJoined?.(res.session, true);
        resolve(res.session);
      });
    });
  }

  public async joinSession(sessionId: string, userId: string, username: string): Promise<SessionData> {
    this.connect();
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error("Socket not initialized"));

      this.socket.emit("session:join", { sessionId, userId, username }, (res: SocketServerResponse) => {
        if (!res || !res.success || !res.session) {
          return reject(new Error(res?.error || "Failed to join session"));
        }

        this.currentSession = res.session;
        this.isHost = this.currentSession?.hostSocketId === this.socket?.id;

        if (!this.isHost && this.driftCompensator) {
          this.driftCompensator.reconcile(res.session);
          this.driftCompensator.startPeriodicCheck();
        }

        this.listeners.onSessionJoined?.(res.session, this.isHost);
        resolve(res.session);
      });
    });
  }

  public broadcastAction(
    action: "PLAY" | "PAUSE" | "SEEK" | "TRACK_CHANGE",
    positionMs: number,
    track?: AudioTrack | null
  ): void {
    if (!this.socket || !this.currentSession || !this.isHost) return;

    this.socket.emit("session:action", {
      action,
      positionMs: Math.round(positionMs),
      track,
      clientTimestamp: Date.now(),
    });
  }

  public leaveSession(): void {
    this.driftCompensator?.stopPeriodicCheck();
    this.driftCompensator?.reset();
    this.currentSession = null;
    this.isHost = false;
    this.listeners.onSessionLeft?.();
  }

  public getSession(): SessionData | null {
    return this.currentSession;
  }

  public getIsHost(): boolean {
    return this.isHost;
  }

  public getMetrics(): ClockSyncMetrics | null {
    return this.clockSync ? this.clockSync.getMetrics() : null;
  }

  public destroy(): void {
    this.leaveSession();
    this.clockSync?.destroy();
    this.driftCompensator?.stopPeriodicCheck();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
