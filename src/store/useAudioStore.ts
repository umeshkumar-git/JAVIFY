import { create } from "zustand";
import { persist, createJSONStorage, subscribeWithSelector } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import { AudioPipeline, AudioTrack } from "../core/audio/AudioPipeline";
import { QueueManager } from "../core/queue/QueueManager";

export type RepeatMode = "OFF" | "ALL" | "ONE";

export interface AudioStoreState {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  isBuffering: boolean;
  status: "PLAYING" | "PAUSED" | "STOPPED";
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  error: string | null;
  queue: AudioTrack[];
  originalQueue: AudioTrack[];
  queueIndex: number;
  repeatMode: RepeatMode;
  isShuffled: boolean;
  pipeline: AudioPipeline;

  // Actions
  play: (track?: AudioTrack) => Promise<void>;
  pause: () => void;
  toggle: () => Promise<void>;
  playTrack: (track: AudioTrack) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seek: (seconds: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  setQueue: (tracks: AudioTrack[], startIndex?: number) => void;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
  stop: () => void;
}

// Initial default pipeline singleton
let globalPipeline: AudioPipeline | null = null;
let activePlayAbortController: AbortController | null = null;
let activeOperationId = 0;

export function normalizeTrack(track: AudioTrack): AudioTrack {
  const localMap: Record<string, string> = {
    "trk-synth-01": "/audio/cybernetic-drift.wav",
    "trk-ambient-02": "/audio/quantum-telemetry.wav",
    "trk-future-03": "/audio/distributed-heartbeat.wav",
    "trk-deep-04": "/audio/binary-monks.wav",
    "trk-cyber-05": "/audio/null-pointer-exception.wav",
  };
  if (track.id && localMap[track.id]) {
    return { ...track, url: localMap[track.id] };
  }
  if (track.url && track.url.includes("actions.google.com")) {
    const matched = Object.keys(localMap).find((k) => track.id === k);
    return { ...track, url: matched ? localMap[matched] : "/audio/cybernetic-drift.wav" };
  }
  return track;
}

function getOrCreatePipeline(
  set: (fn: Partial<AudioStoreState> | ((state: AudioStoreState) => Partial<AudioStoreState>)) => void,
  get: () => AudioStoreState
): AudioPipeline {
  if (globalPipeline) return globalPipeline;

  globalPipeline = new AudioPipeline({
    onStateChange: (status) =>
      set({
        status,
        isPlaying: status === "PLAYING",
        ...(status !== "PLAYING" ? { isBuffering: false } : {}),
      }),
    onBuffering: (isBuffering) => set({ isBuffering }),
    onTimeUpdate: (currentTime, duration) => set({ currentTime, duration }),
    onTrackEnded: () => {
      const { repeatMode, currentTrack } = get();
      if (repeatMode === "ONE" && currentTrack) {
        get().seek(0);
        get().play(currentTrack);
      } else {
        get().nextTrack();
      }
    },
    onError: (err) => {
      console.error("[AudioPipeline Error]", err);
      set({ error: err.message, isPlaying: false, status: "STOPPED", isBuffering: false });
    },
  });

  return globalPipeline;
}

export const useAudioStore = create<AudioStoreState>()(
  subscribeWithSelector(
    persist(
      (set, get) => {
        const pipeline = getOrCreatePipeline(set, get);

        return {
          currentTrack: null,
          isPlaying: false,
          isBuffering: false,
          status: "STOPPED",
          currentTime: 0,
          duration: 0,
          volume: 0.85,
          isMuted: false,
          error: null,
          queue: [],
          originalQueue: [],
          queueIndex: -1,
          repeatMode: "OFF",
          isShuffled: false,
          pipeline,

          play: async (track?: AudioTrack) => {
            const rawTarget = track || get().currentTrack;
            if (!rawTarget) {
              const { queue, queueIndex } = get();
              if (queue.length > 0) {
                const nextIndex = queueIndex >= 0 ? queueIndex : 0;
                await get().play(queue[nextIndex]);
              }
              return;
            }

            const targetTrack = normalizeTrack(rawTarget);

            // Abort previous inflight playback/load request
            if (activePlayAbortController) {
              activePlayAbortController.abort();
            }
            activePlayAbortController = new AbortController();
            const currentSignal = activePlayAbortController.signal;
            const opId = ++activeOperationId;

            const isNewTrack =
              !get().currentTrack ||
              get().currentTrack?.id !== targetTrack.id ||
              get().currentTrack?.url !== targetTrack.url ||
              pipeline.getCurrentTrack()?.id !== targetTrack.id ||
              pipeline.getCurrentTrack()?.url !== targetTrack.url;

            try {
              if (isNewTrack) {
                set({
                  currentTrack: targetTrack,
                  currentTime: 0,
                  duration: targetTrack.duration || 0,
                  isBuffering: true,
                  error: null,
                });
                await pipeline.loadTrack(targetTrack, false);
              }

              if (currentSignal.aborted || opId !== activeOperationId) return;

              set({ isBuffering: true });
              await pipeline.play();

              if (currentSignal.aborted || opId !== activeOperationId) {
                pipeline.pause();
                return;
              }

              set({ isPlaying: true, status: "PLAYING", isBuffering: false, error: null });
            } catch (err: unknown) {
              if (err instanceof DOMException && err.name === "AbortError") {
                return;
              }
              const message = err instanceof Error ? err.message : "Playback initiation failed";
              set({ isPlaying: false, status: "PAUSED", isBuffering: false, error: message });
            }
          },

          pause: () => {
            if (activePlayAbortController) {
              activePlayAbortController.abort();
              activePlayAbortController = null;
            }
            activeOperationId++;
            pipeline.pause();
            set({ isPlaying: false, status: "PAUSED", isBuffering: false });
          },

          toggle: async () => {
            const { isPlaying } = get();
            if (isPlaying) {
              get().pause();
            } else {
              await get().play();
            }
          },

          playTrack: async (track: AudioTrack) => {
            await get().play(track);
          },

          togglePlayPause: async () => {
            await get().toggle();
          },

          seek: (seconds: number) => {
            pipeline.seek(seconds);
            set({ currentTime: seconds });
          },

          setVolume: (vol: number) => {
            const clamped = Math.max(0, Math.min(vol, 1));
            pipeline.setVolume(clamped);
            set({ volume: clamped, isMuted: false });
          },

          toggleMute: () => {
            const isMuted = !get().isMuted;
            pipeline.setMute(isMuted);
            set({ isMuted });
          },

          nextTrack: async () => {
            const { queue, queueIndex, repeatMode } = get();
            if (queue.length === 0) return;

            const isLastTrack = queueIndex >= queue.length - 1;
            if (isLastTrack && repeatMode === "OFF") {
              get().pause();
              set({ status: "STOPPED", isPlaying: false, currentTime: 0 });
              return;
            }

            const nextIndex = (queueIndex + 1) % queue.length;
            set({ queueIndex: nextIndex });
            await get().play(queue[nextIndex]);
          },

          previousTrack: async () => {
            const { queue, queueIndex, currentTime } = get();
            if (queue.length === 0) return;

            // If more than 3 seconds in, restart track
            if (currentTime > 3) {
              get().seek(0);
              return;
            }

            const prevIndex = (queueIndex - 1 + queue.length) % queue.length;
            set({ queueIndex: prevIndex });
            await get().play(queue[prevIndex]);
          },

          setQueue: (tracks: AudioTrack[], startIndex = 0) => {
            const normalizedTracks = tracks.map(normalizeTrack);
            const isShuffled = get().isShuffled;
            if (isShuffled) {
              const selectedTrack = normalizedTracks[startIndex];
              const remaining = normalizedTracks.filter((_, idx) => idx !== startIndex);
              const shuffled = [selectedTrack, ...QueueManager.fisherYatesShuffle(remaining)].filter(Boolean);
              set({
                originalQueue: normalizedTracks,
                queue: shuffled,
                queueIndex: 0,
              });
              if (shuffled[0]) {
                get().play(shuffled[0]);
              }
            } else {
              set({ originalQueue: normalizedTracks, queue: normalizedTracks, queueIndex: startIndex });
              if (normalizedTracks[startIndex]) {
                get().play(normalizedTracks[startIndex]);
              }
            }
          },

          toggleShuffle: () => {
            const { isShuffled, queue, originalQueue, currentTrack } = get();
            const qm = new QueueManager(originalQueue);

            if (!isShuffled) {
              const result = qm.toggleShuffle(currentTrack?.id);
              set({
                isShuffled: true,
                queue: result.queue,
                queueIndex: result.newIndex,
              });
            } else {
              const restoredIndex = currentTrack
                ? originalQueue.findIndex((t) => t.id === currentTrack.id)
                : 0;
              set({
                isShuffled: false,
                queue: originalQueue.length > 0 ? originalQueue : queue,
                queueIndex: Math.max(0, restoredIndex),
              });
            }
          },

          cycleRepeatMode: () => {
            const current = get().repeatMode;
            const modes: RepeatMode[] = ["OFF", "ALL", "ONE"];
            const nextIndex = (modes.indexOf(current) + 1) % modes.length;
            set({ repeatMode: modes[nextIndex] });
          },

          stop: () => {
            get().pause();
            set({
              currentTrack: null,
              currentTime: 0,
              duration: 0,
              isPlaying: false,
              isBuffering: false,
              status: "STOPPED",
              error: null,
            });
          },
        };
      },
      {
        name: "javify_audio_state",
        storage: createJSONStorage(() => localStorage),
        onRehydrateStorage: () => (state) => {
          if (!state) return;
          if (state.currentTrack) {
            state.currentTrack = normalizeTrack(state.currentTrack);
          }
          if (Array.isArray(state.queue)) {
            state.queue = state.queue.map(normalizeTrack);
          }
          if (Array.isArray(state.originalQueue)) {
            state.originalQueue = state.originalQueue.map(normalizeTrack);
          }
        },
        partialize: (state) => ({
          volume: state.volume,
          isMuted: state.isMuted,
          currentTrack: state.currentTrack ? normalizeTrack(state.currentTrack) : null,
          queue: state.queue.map(normalizeTrack),
          originalQueue: state.originalQueue.map(normalizeTrack),
          queueIndex: state.queueIndex,
          repeatMode: state.repeatMode,
          isShuffled: state.isShuffled,
        }),
      }
    )
  )
);

// Granular selector hooks preventing unnecessary whole-tree DOM re-renders
export const useCurrentTrack = () => useAudioStore((s) => s.currentTrack);
export const usePlaybackStatus = () => useAudioStore((s) => s.status);
export const useIsPlaying = () => useAudioStore((s) => s.isPlaying);
export const useIsBuffering = () => useAudioStore((s) => s.isBuffering);
export const useAudioError = () => useAudioStore((s) => s.error);

export const useAudioVolume = () =>
  useAudioStore(
    useShallow((s) => ({
      volume: s.volume,
      isMuted: s.isMuted,
      setVolume: s.setVolume,
      toggleMute: s.toggleMute,
    }))
  );

export const useAudioQueue = () =>
  useAudioStore(useShallow((s) => ({ queue: s.queue, queueIndex: s.queueIndex })));

export const usePlaybackModes = () =>
  useAudioStore(
    useShallow((s) => ({
      repeatMode: s.repeatMode,
      isShuffled: s.isShuffled,
      toggleShuffle: s.toggleShuffle,
      cycleRepeatMode: s.cycleRepeatMode,
    }))
  );

export const useAudioActions = () =>
  useAudioStore(
    useShallow((s) => ({
      play: s.play,
      pause: s.pause,
      toggle: s.toggle,
      playTrack: s.playTrack,
      togglePlayPause: s.togglePlayPause,
      seek: s.seek,
      setVolume: s.setVolume,
      toggleMute: s.toggleMute,
      nextTrack: s.nextTrack,
      previousTrack: s.previousTrack,
      stop: s.stop,
    }))
  );

/**
 * High-performance scoped progress hook.
 * Only the component subscribing to this hook will re-render on timeupdate.
 */
export const useAudioProgress = () =>
  useAudioStore(
    useShallow((s) => ({
      currentTime: s.currentTime,
      duration: s.duration,
      percent: s.duration > 0 ? (s.currentTime / s.duration) * 100 : 0,
      seek: s.seek,
    }))
  );

/**
 * Transient subscription for 0 React re-renders during playback.
 */
export function subscribeToAudioProgress(
  onProgress: (progress: { currentTime: number; duration: number; percent: number }) => void
): () => void {
  return useAudioStore.subscribe(
    (state) => ({ currentTime: state.currentTime, duration: state.duration }),
    ({ currentTime, duration }) => {
      const percent = duration > 0 ? (currentTime / duration) * 100 : 0;
      onProgress({ currentTime, duration, percent });
    },
    { equalityFn: (a, b) => a.currentTime === b.currentTime && a.duration === b.duration }
  );
}
