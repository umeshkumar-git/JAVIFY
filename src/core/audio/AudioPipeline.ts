import { AudioControlTarget } from "../sync/DriftCompensator";

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  url: string;
  coverUrl?: string;
  genre?: string;
}

export interface AudioPipelineEvents {
  onStateChange: (status: "PLAYING" | "PAUSED" | "STOPPED") => void;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onTrackEnded: () => void;
  onError: (error: Error) => void;
}

/**
 * Enterprise Web Audio API Processing Pipeline.
 *
 * Architecture:
 * HTMLMediaElement -> MediaElementAudioSourceNode
 *   -> BiquadFilterNode (Low/Mid/High EQ)
 *   -> AnalyserNode (FFT 1024 for 60fps visualizer)
 *   -> GainNode (Exponential smooth volume ramping with click/pop prevention)
 *   -> AudioContext.destination
 */
export class AudioPipeline implements AudioControlTarget {
  private audioContext: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private lowFilter: BiquadFilterNode | null = null;
  private midFilter: BiquadFilterNode | null = null;
  private highFilter: BiquadFilterNode | null = null;

  private currentTrack: AudioTrack | null = null;
  private status: "PLAYING" | "PAUSED" | "STOPPED" = "STOPPED";
  private volume = 0.8;
  private isMuted = false;
  private isInitialized = false;

  private timeUpdateRaf: number | null = null;

  constructor(private readonly events: Partial<AudioPipelineEvents> = {}) {}

  /**
   * Initializes the Web Audio graph on first user interaction.
   * Browsers require a user gesture before starting the AudioContext.
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;
    if (typeof window === "undefined") return;

    interface WebkitWindow extends Window {
      webkitAudioContext?: typeof AudioContext;
    }
    const AudioContextClass = window.AudioContext || (window as unknown as WebkitWindow).webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error("Web Audio API is not supported in this browser.");
    }

    this.audioContext = new AudioContextClass();
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = "anonymous";
    this.audioElement.preload = "auto";

    // Create DSP Nodes
    this.sourceNode = this.audioContext.createMediaElementSource(this.audioElement);
    this.gainNode = this.audioContext.createGain();
    this.analyserNode = this.audioContext.createAnalyser();

    // 1024 FFT gives 512 frequency bins with ~43Hz resolution
    this.analyserNode.fftSize = 1024;
    this.analyserNode.smoothingTimeConstant = 0.82;

    // 3-Band Equalizer Filters
    this.lowFilter = this.audioContext.createBiquadFilter();
    this.lowFilter.type = "lowshelf";
    this.lowFilter.frequency.value = 320; // 320 Hz Bass shelf

    this.midFilter = this.audioContext.createBiquadFilter();
    this.midFilter.type = "peaking";
    this.midFilter.frequency.value = 1000; // 1 kHz Mid peak
    this.midFilter.Q.value = 0.5;

    this.highFilter = this.audioContext.createBiquadFilter();
    this.highFilter.type = "highshelf";
    this.highFilter.frequency.value = 3200; // 3.2 kHz Treble shelf

    // Set initial gain
    this.gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);

    // Audio Graph Routing:
    // Source -> Low -> Mid -> High -> Analyser -> Master Gain -> Destination
    this.sourceNode
      .connect(this.lowFilter)
      .connect(this.midFilter)
      .connect(this.highFilter)
      .connect(this.analyserNode)
      .connect(this.gainNode)
      .connect(this.audioContext.destination);

    this.bindAudioEvents();
    this.isInitialized = true;
  }

  private bindAudioEvents(): void {
    if (!this.audioElement) return;

    this.audioElement.addEventListener("play", () => {
      this.status = "PLAYING";
      this.events.onStateChange?.("PLAYING");
      this.startTimeTracker();
    });

    this.audioElement.addEventListener("pause", () => {
      this.status = "PAUSED";
      this.events.onStateChange?.("PAUSED");
      this.stopTimeTracker();
    });

    this.audioElement.addEventListener("ended", () => {
      this.status = "STOPPED";
      this.events.onStateChange?.("STOPPED");
      this.stopTimeTracker();
      this.events.onTrackEnded?.();
    });

    this.audioElement.addEventListener("error", () => {
      this.events.onError?.(new Error(`Audio pipeline playback error: ${this.audioElement?.error?.message || "Unknown error"}`));
    });
  }

  public async loadTrack(track: AudioTrack, autoPlay = false): Promise<void> {
    await this.init();

    if (this.audioContext?.state === "suspended") {
      await this.audioContext.resume();
    }

    this.currentTrack = track;
    if (this.audioElement) {
      this.audioElement.src = track.url;
      this.audioElement.load();
    }

    if (autoPlay) {
      await this.play();
    }
  }

  public async play(): Promise<void> {
    await this.init();

    if (this.audioContext?.state === "suspended") {
      await this.audioContext.resume();
    }

    if (!this.audioElement) return;

    // Zero-click pop: smooth linear ramp-up from 0.0 to desired volume over 30ms
    if (this.gainNode && this.audioContext) {
      const now = this.audioContext.currentTime;
      const targetGain = this.isMuted ? 0 : this.volume;
      this.gainNode.gain.cancelScheduledValues(now);
      this.gainNode.gain.setValueAtTime(0.001, now);
      this.gainNode.gain.linearRampToValueAtTime(targetGain, now + 0.035);
    }

    await this.audioElement.play();
  }

  public pause(): void {
    if (!this.audioElement) return;

    // Zero-click pop: ramp gain down before pausing
    if (this.gainNode && this.audioContext) {
      const now = this.audioContext.currentTime;
      this.gainNode.gain.cancelScheduledValues(now);
      this.gainNode.gain.linearRampToValueAtTime(0.0001, now + 0.025);
      setTimeout(() => {
        this.audioElement?.pause();
      }, 25);
    } else {
      this.audioElement.pause();
    }
  }

  public seek(timeInSeconds: number): void {
    if (!this.audioElement) return;
    const clamped = Math.max(0, Math.min(timeInSeconds, this.getDuration()));
    this.audioElement.currentTime = clamped;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(vol, 1));
    if (!this.isMuted && this.gainNode && this.audioContext) {
      const now = this.audioContext.currentTime;
      this.gainNode.gain.cancelScheduledValues(now);
      this.gainNode.gain.linearRampToValueAtTime(this.volume, now + 0.04);
    }
  }

  public setMute(muted: boolean): void {
    this.isMuted = muted;
    if (this.gainNode && this.audioContext) {
      const now = this.audioContext.currentTime;
      const target = muted ? 0.0001 : this.volume;
      this.gainNode.gain.cancelScheduledValues(now);
      this.gainNode.gain.linearRampToValueAtTime(target, now + 0.03);
    }
  }

  public setPlaybackRate(rate: number): void {
    if (!this.audioElement) return;
    // Bound playback rate to prevent audio degradation (0.95x - 1.05x during sync)
    const clamped = Math.max(0.8, Math.min(rate, 1.2));
    this.audioElement.playbackRate = clamped;
  }

  public getCurrentTime(): number {
    return this.audioElement?.currentTime || 0;
  }

  public getDuration(): number {
    return this.audioElement?.duration || this.currentTrack?.duration || 0;
  }

  public getStatus(): "PLAYING" | "PAUSED" | "STOPPED" {
    return this.status;
  }

  public getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode;
  }

  public getCurrentTrack(): AudioTrack | null {
    return this.currentTrack;
  }

  private startTimeTracker(): void {
    this.stopTimeTracker();
    const update = () => {
      if (this.audioElement) {
        this.events.onTimeUpdate?.(this.audioElement.currentTime, this.getDuration());
      }
      this.timeUpdateRaf = requestAnimationFrame(update);
    };
    this.timeUpdateRaf = requestAnimationFrame(update);
  }

  private stopTimeTracker(): void {
    if (this.timeUpdateRaf !== null) {
      cancelAnimationFrame(this.timeUpdateRaf);
      this.timeUpdateRaf = null;
    }
  }

  public destroy(): void {
    this.stopTimeTracker();
    this.audioElement?.pause();
    this.audioContext?.close().catch(() => {});
  }
}
