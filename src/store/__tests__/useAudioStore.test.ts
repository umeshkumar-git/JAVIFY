import { describe, it, expect, beforeEach } from "vitest";
import { useAudioStore } from "../useAudioStore";
import { AudioTrack } from "../../core/audio/AudioPipeline";

describe("useAudioStore (Decoupled Audio Engine State)", () => {
  const mockTracks: AudioTrack[] = [
    {
      id: "trk-1",
      title: "Neon City",
      artist: "Synth Runner",
      duration: 180,
      url: "https://example.com/audio1.mp3",
    },
    {
      id: "trk-2",
      title: "Cyber Alley",
      artist: "Grid Walker",
      duration: 200,
      url: "https://example.com/audio2.mp3",
    },
    {
      id: "trk-3",
      title: "Data Stream",
      artist: "Bit Shifter",
      duration: 150,
      url: "https://example.com/audio3.mp3",
    },
  ];

  beforeEach(() => {
    // Reset store state
    useAudioStore.setState({
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
    });
  });

  it("sets queue and updates current track", () => {
    useAudioStore.getState().setQueue(mockTracks, 0);

    const state = useAudioStore.getState();
    expect(state.queue).toHaveLength(3);
    expect(state.currentTrack?.id).toBe("trk-1");
    expect(state.queueIndex).toBe(0);
  });

  it("toggles shuffle and preserves currently playing track", () => {
    useAudioStore.getState().setQueue(mockTracks, 1); // Start at trk-2

    expect(useAudioStore.getState().currentTrack?.id).toBe("trk-2");

    // Enable shuffle
    useAudioStore.getState().toggleShuffle();
    let state = useAudioStore.getState();
    expect(state.isShuffled).toBe(true);
    expect(state.currentTrack?.id).toBe("trk-2"); // Still playing trk-2

    // Disable shuffle: should restore original queue
    useAudioStore.getState().toggleShuffle();
    state = useAudioStore.getState();
    expect(state.isShuffled).toBe(false);
    expect(state.queue[0].id).toBe("trk-1");
    expect(state.queue[1].id).toBe("trk-2");
  });

  it("cycles repeat mode through OFF -> ALL -> ONE -> OFF", () => {
    expect(useAudioStore.getState().repeatMode).toBe("OFF");

    useAudioStore.getState().cycleRepeatMode();
    expect(useAudioStore.getState().repeatMode).toBe("ALL");

    useAudioStore.getState().cycleRepeatMode();
    expect(useAudioStore.getState().repeatMode).toBe("ONE");

    useAudioStore.getState().cycleRepeatMode();
    expect(useAudioStore.getState().repeatMode).toBe("OFF");
  });

  it("clamps volume between 0.0 and 1.0 and toggles mute", () => {
    useAudioStore.getState().setVolume(1.5);
    expect(useAudioStore.getState().volume).toBe(1.0);

    useAudioStore.getState().setVolume(-0.5);
    expect(useAudioStore.getState().volume).toBe(0.0);

    useAudioStore.getState().setVolume(0.7);
    expect(useAudioStore.getState().volume).toBe(0.7);

    // Mute toggle
    useAudioStore.getState().toggleMute();
    expect(useAudioStore.getState().isMuted).toBe(true);

    useAudioStore.getState().toggleMute();
    expect(useAudioStore.getState().isMuted).toBe(false);
  });
});
