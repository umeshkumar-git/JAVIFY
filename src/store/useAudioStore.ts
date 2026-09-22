import { create } from "zustand";
import { AudioPipeline, AudioTrack } from "../core/audio/AudioPipeline";

interface AudioStoreState {
  currentTrack: AudioTrack | null;
  status: "PLAYING" | "PAUSED" | "STOPPED";
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  queue: AudioTrack[];
  queueIndex: number;
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
}

// Initial default pipeline singleton
let globalPipeline: AudioPipeline | null = null;

function getOrCreatePipeline(set: any, get: any): AudioPipeline {
  if (globalPipeline) return globalPipeline;

  globalPipeline = new AudioPipeline({
    onStateChange: (status) => set({ status }),
    onTimeUpdate: (currentTime, duration) => set({ currentTime, duration }),
    onTrackEnded: () => {
      get().nextTrack();
    },
    onError: (err) => {
      console.error("[AudioPipeline Error]", err);
    },
  });

  return globalPipeline;
}

export const useAudioStore = create<AudioStoreState>((set, get) => {
  const pipeline = getOrCreatePipeline(set, get);

  return {
    currentTrack: null,
    status: "STOPPED",
    currentTime: 0,
    duration: 0,
    volume: 0.85,
    isMuted: false,
    queue: [],
    queueIndex: -1,
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
      pipeline.setVolume(vol);
      set({ volume: vol, isMuted: false });
    },

    toggleMute: () => {
      const isMuted = !get().isMuted;
      pipeline.setMute(isMuted);
      set({ isMuted });
    },

    nextTrack: async () => {
      const { queue, queueIndex } = get();
      if (queue.length === 0) return;
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
      set({ queue: tracks, queueIndex: startIndex });
      if (tracks[startIndex]) {
        get().playTrack(tracks[startIndex]);
      }
    },
  };
});
