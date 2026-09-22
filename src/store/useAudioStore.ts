import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { AudioPipeline, AudioTrack } from "../core/audio/AudioPipeline";

export type RepeatMode = "OFF" | "ALL" | "ONE";

export interface AudioStoreState {
  currentTrack: AudioTrack | null;
  status: "PLAYING" | "PAUSED" | "STOPPED";
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  queue: AudioTrack[];
  originalQueue: AudioTrack[];
  queueIndex: number;
  repeatMode: RepeatMode;
  isShuffled: boolean;
  pipeline: AudioPipeline;

  // Actions
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
}

// Initial default pipeline singleton
let globalPipeline: AudioPipeline | null = null;

function getOrCreatePipeline(set: any, get: any): AudioPipeline {
  if (globalPipeline) return globalPipeline;

  globalPipeline = new AudioPipeline({
    onStateChange: (status) => set({ status }),
    onTimeUpdate: (currentTime, duration) => set({ currentTime, duration }),
    onTrackEnded: () => {
      const { repeatMode, currentTrack } = get();
      if (repeatMode === "ONE" && currentTrack) {
        get().seek(0);
        get().playTrack(currentTrack);
      } else {
        get().nextTrack();
      }
    },
    onError: (err) => {
      console.error("[AudioPipeline Error]", err);
    },
  });

  return globalPipeline;
}

/**
 * Modern Fisher-Yates shuffle algorithm.
 */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const useAudioStore = create<AudioStoreState>()(
  persist(
    (set, get) => {
      const pipeline = getOrCreatePipeline(set, get);

      return {
        currentTrack: null,
        status: "STOPPED",
        currentTime: 0,
        duration: 0,
        volume: 0.85,
        isMuted: false,
        queue: [],
        originalQueue: [],
        queueIndex: -1,
        repeatMode: "OFF",
        isShuffled: false,
        pipeline,

        playTrack: async (track: AudioTrack) => {
          set({ currentTrack: track });
          await pipeline.loadTrack(track, true);
        },

        togglePlayPause: async () => {
          const { status, currentTrack, queue, queueIndex } = get();
          if (!currentTrack && queue.length > 0) {
            const nextIndex = queueIndex >= 0 ? queueIndex : 0;
            await get().playTrack(queue[nextIndex]);
            return;
          }

          if (status === "PLAYING") {
            pipeline.pause();
          } else {
            await pipeline.play();
          }
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
            pipeline.pause();
            set({ status: "STOPPED", currentTime: 0 });
            return;
          }

          const nextIndex = (queueIndex + 1) % queue.length;
          set({ queueIndex: nextIndex });
          await get().playTrack(queue[nextIndex]);
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
          await get().playTrack(queue[prevIndex]);
        },

        setQueue: (tracks: AudioTrack[], startIndex = 0) => {
          const isShuffled = get().isShuffled;
          if (isShuffled) {
            const selectedTrack = tracks[startIndex];
            const remaining = tracks.filter((_, idx) => idx !== startIndex);
            const shuffled = [selectedTrack, ...shuffleArray(remaining)].filter(Boolean);
            set({
              originalQueue: tracks,
              queue: shuffled,
              queueIndex: 0,
            });
            if (shuffled[0]) {
              get().playTrack(shuffled[0]);
            }
          } else {
            set({ originalQueue: tracks, queue: tracks, queueIndex: startIndex });
            if (tracks[startIndex]) {
              get().playTrack(tracks[startIndex]);
            }
          }
        },

        toggleShuffle: () => {
          const { isShuffled, queue, originalQueue, currentTrack } = get();
          const nextShuffled = !isShuffled;

          if (nextShuffled) {
            const current = currentTrack;
            const remaining = originalQueue.filter((t) => t.id !== current?.id);
            const shuffled = current ? [current, ...shuffleArray(remaining)] : shuffleArray(originalQueue);
            set({
              isShuffled: true,
              queue: shuffled,
              queueIndex: current ? 0 : 0,
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
      };
    },
    {
      name: "javify_audio_state",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        volume: state.volume,
        isMuted: state.isMuted,
        currentTrack: state.currentTrack,
        queue: state.queue,
        originalQueue: state.originalQueue,
        queueIndex: state.queueIndex,
        repeatMode: state.repeatMode,
        isShuffled: state.isShuffled,
      }),
    }
  )
);

// Granular selector hooks preventing unnecessary whole-tree DOM re-renders
export const useCurrentTrack = () => useAudioStore((s) => s.currentTrack);
export const usePlaybackStatus = () => useAudioStore((s) => s.status);
export const useAudioVolume = () =>
  useAudioStore((s) => ({ volume: s.volume, isMuted: s.isMuted, setVolume: s.setVolume, toggleMute: s.toggleMute }));
export const useAudioQueue = () =>
  useAudioStore((s) => ({ queue: s.queue, queueIndex: s.queueIndex }));
export const usePlaybackModes = () =>
  useAudioStore((s) => ({
    repeatMode: s.repeatMode,
    isShuffled: s.isShuffled,
    toggleShuffle: s.toggleShuffle,
    cycleRepeatMode: s.cycleRepeatMode,
  }));
