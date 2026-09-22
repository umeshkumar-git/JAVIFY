import { create } from "zustand";
import {
  SessionClient,
  SessionData,
  Participant,
} from "../core/sync/SessionClient";
import { ClockSyncMetrics } from "../core/sync/ClockSync";
import { DriftDiagnosis } from "../core/sync/DriftCompensator";
import { AudioTrack } from "../core/audio/AudioPipeline";
import { useAudioStore } from "./useAudioStore";

interface SessionStoreState {
  session: SessionData | null;
  isHost: boolean;
  connectionStatus: "CONNECTED" | "CONNECTING" | "DISCONNECTED" | "RECONNECTING";
  driftMetrics: ClockSyncMetrics | null;
  latestDiagnosis: DriftDiagnosis | null;
  sessionClient: SessionClient | null;
  isModalOpen: boolean;
  errorMessage: string | null;

  // Actions
  initClient: () => SessionClient;
  createSession: (username?: string) => Promise<void>;
  joinSession: (sessionId: string, username?: string) => Promise<void>;
  leaveSession: () => void;
  broadcastAction: (action: "PLAY" | "PAUSE" | "SEEK" | "TRACK_CHANGE", positionMs: number, track?: AudioTrack | null) => void;
  setModalOpen: (open: boolean) => void;
  clearError: () => void;
}

export const useSessionStore = create<SessionStoreState>((set, get) => ({
  session: null,
  isHost: false,
  connectionStatus: "DISCONNECTED",
  driftMetrics: null,
  latestDiagnosis: null,
  sessionClient: null,
  isModalOpen: false,
  errorMessage: null,

  initClient: () => {
    let client = get().sessionClient;
    if (client) return client;

    const audioPipeline = useAudioStore.getState().pipeline;

    client = new SessionClient(
      window.location.hostname === "localhost" ? "http://localhost:4000" : window.location.origin,
      audioPipeline,
      {
        onSessionJoined: (session, isHost) => {
          set({ session, isHost, errorMessage: null });
          if (!isHost && session.currentTrack) {
            useAudioStore.getState().playTrack(session.currentTrack);
          }
        },
        onSessionLeft: () => {
          set({ session: null, isHost: false, latestDiagnosis: null });
        },
        onParticipantUpdate: (participants: Participant[]) => {
          set((state) => (state.session ? { session: { ...state.session, participants } } : {}));
        },
        onHostChanged: (newHostId, isMe) => {
          set((state) => ({
            isHost: isMe,
            session: state.session ? { ...state.session, hostId: newHostId } : null,
          }));
        },
        onSyncDiagnosis: (diagnosis: DriftDiagnosis) => {
          set({ latestDiagnosis: diagnosis });
        },
        onMetricsUpdate: (metrics: ClockSyncMetrics) => {
          set({ driftMetrics: metrics });
        },
        onConnectionStatusChange: (connectionStatus) => {
          set({ connectionStatus });
        },
      }
    );

    set({ sessionClient: client });
    return client;
  },

  createSession: async (username = "Pioneer") => {
    try {
      const client = get().initClient();
      const currentTrack = useAudioStore.getState().currentTrack;
      const session = await client.createSession(`usr_${Date.now()}`, username, currentTrack || undefined);
      set({ session, isHost: true, errorMessage: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create session";
      set({ errorMessage: message });
    }
  },

  joinSession: async (sessionId: string, username = "Listener") => {
    try {
      const client = get().initClient();
      const session = await client.joinSession(sessionId.trim(), `usr_${Date.now()}`, username);
      set({ session, isHost: false, errorMessage: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to join session";
      set({ errorMessage: message });
    }
  },

  leaveSession: () => {
    const client = get().sessionClient;
    if (client) {
      client.leaveSession();
    }
    set({ session: null, isHost: false, latestDiagnosis: null });
  },

  broadcastAction: (action, positionMs, track) => {
    const { sessionClient, isHost } = get();
    if (sessionClient && isHost) {
      sessionClient.broadcastAction(action, positionMs, track);
    }
  },

  setModalOpen: (isModalOpen: boolean) => set({ isModalOpen }),
  clearError: () => set({ errorMessage: null }),
}));
