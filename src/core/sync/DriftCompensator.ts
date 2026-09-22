import { ClockSync } from "./ClockSync";

export type CompensationMode = "IN_SYNC" | "MICRO_SPEED_UP" | "MICRO_SLOW_DOWN" | "HARD_SEEK";

export interface DriftDiagnosis {
  expectedPositionMs: number;
  actualPositionMs: number;
  driftMs: number;
  mode: CompensationMode;
  appliedPlaybackRate: number;
  evaluatedAt: number;
}

export interface SyncTargetState {
  status: "PLAYING" | "PAUSED" | "STOPPED";
  positionMs: number;
  serverTimestamp: number;
  seq: number;
}

export interface AudioControlTarget {
  getCurrentTime(): number; // in seconds
  seek(timeInSeconds: number): void;
  setPlaybackRate(rate: number): void;
  play(): Promise<void>;
  pause(): void;
  getStatus(): "PLAYING" | "PAUSED" | "STOPPED";
}

/**
 * Intelligent Audio Drift Compensator.
 * Dynamically reconciles client audio position against synchronized server reference timeline.
 * Uses micro-pitch tempo adjustments for slight discrepancies (25ms - 160ms)
 * and seamless hard seeks for major timeline breaks (> 160ms).
 */
export class DriftCompensator {
  private lastEvaluatedSeq = -1;
  private currentMode: CompensationMode = "IN_SYNC";
  private checkIntervalTimer: any = null;
  private currentTarget: SyncTargetState | null = null;

  // Thresholds in milliseconds
  public static readonly TOLERANCE_WINDOW_MS = 25; // Imperceptible drift
  public static readonly HARD_SEEK_THRESHOLD_MS = 160; // Beyond this, micro-adjusting takes too long

  // Micro-tempo factors
  public static readonly SPEED_UP_RATE = 1.018; // +1.8% speed
  public static readonly SLOW_DOWN_RATE = 0.982; // -1.8% speed
  public static readonly NORMAL_RATE = 1.0;

  constructor(
    private readonly audio: AudioControlTarget,
    private readonly clockSync: ClockSync,
    private readonly onDiagnosis?: (diag: DriftDiagnosis) => void
  ) {}

  /**
   * Reconciles playback state upon receiving a server broadcast event.
   */
  public reconcile(target: SyncTargetState): DriftDiagnosis {
    // Drop outdated sequence messages to prevent race conditions
    if (target.seq <= this.lastEvaluatedSeq) {
      return this.diagnoseOnly(target);
    }

    this.lastEvaluatedSeq = target.seq;
    this.currentTarget = target;

    const expectedPositionMs = this.computeExpectedPosition(target);
    const actualPositionMs = Math.round(this.audio.getCurrentTime() * 1000);
    const driftMs = actualPositionMs - expectedPositionMs;

    // Handle status alignment
    if (target.status === "PAUSED") {
      this.audio.pause();
      if (Math.abs(driftMs) > DriftCompensator.TOLERANCE_WINDOW_MS) {
        this.audio.seek(expectedPositionMs / 1000);
      }
      this.audio.setPlaybackRate(DriftCompensator.NORMAL_RATE);
      this.currentMode = "IN_SYNC";
      return this.buildDiagnosis(expectedPositionMs, actualPositionMs, 0, "IN_SYNC", 1.0);
    }

    if (target.status === "PLAYING") {
      const audioStatus = this.audio.getStatus();
      if (audioStatus !== "PLAYING") {
        this.audio.seek(expectedPositionMs / 1000);
        this.audio.play().catch(() => {});
      }
    }

    // Apply drift compensation policy
    return this.applyCompensation(expectedPositionMs, actualPositionMs, driftMs);
  }

  /**
   * Continuous background alignment tick.
   * Keeps audio synchronized even during long-playing tracks with no host actions.
   */
  public evaluateContinuous(): DriftDiagnosis | null {
    if (!this.currentTarget || this.currentTarget.status !== "PLAYING") {
      return null;
    }

    const expectedPositionMs = this.computeExpectedPosition(this.currentTarget);
    const actualPositionMs = Math.round(this.audio.getCurrentTime() * 1000);
    const driftMs = actualPositionMs - expectedPositionMs;

    return this.applyCompensation(expectedPositionMs, actualPositionMs, driftMs);
  }

  private applyCompensation(
    expectedPositionMs: number,
    actualPositionMs: number,
    driftMs: number
  ): DriftDiagnosis {
    const absDrift = Math.abs(driftMs);
    let appliedRate = DriftCompensator.NORMAL_RATE;
    let mode: CompensationMode = "IN_SYNC";

    if (absDrift > DriftCompensator.HARD_SEEK_THRESHOLD_MS) {
      // Large drift: hard seek
      mode = "HARD_SEEK";
      this.audio.seek(expectedPositionMs / 1000);
      appliedRate = DriftCompensator.NORMAL_RATE;
      this.audio.setPlaybackRate(appliedRate);
    } else if (absDrift > DriftCompensator.TOLERANCE_WINDOW_MS) {
      // Moderate drift: micro-adjust playback rate without audio cut
      if (driftMs < 0) {
        // Client is behind target -> speed up
        mode = "MICRO_SPEED_UP";
        appliedRate = DriftCompensator.SPEED_UP_RATE;
      } else {
        // Client is ahead of target -> slow down
        mode = "MICRO_SLOW_DOWN";
        appliedRate = DriftCompensator.SLOW_DOWN_RATE;
      }
      this.audio.setPlaybackRate(appliedRate);
    } else {
      // Perfect sync (< 25ms)
      mode = "IN_SYNC";
      appliedRate = DriftCompensator.NORMAL_RATE;
      this.audio.setPlaybackRate(appliedRate);
    }

    this.currentMode = mode;
    const diagnosis = this.buildDiagnosis(expectedPositionMs, actualPositionMs, driftMs, mode, appliedRate);

    if (this.onDiagnosis) {
      this.onDiagnosis(diagnosis);
    }

    return diagnosis;
  }

  public computeExpectedPosition(target: SyncTargetState): number {
    if (target.status !== "PLAYING") {
      return Math.max(0, target.positionMs);
    }

    const nowServer = this.clockSync.nowServer();
    const elapsedSinceBroadcast = Math.max(0, nowServer - target.serverTimestamp);
    return Math.max(0, target.positionMs + elapsedSinceBroadcast);
  }

  private diagnoseOnly(target: SyncTargetState): DriftDiagnosis {
    const expected = this.computeExpectedPosition(target);
    const actual = Math.round(this.audio.getCurrentTime() * 1000);
    return this.buildDiagnosis(expected, actual, actual - expected, this.currentMode, DriftCompensator.NORMAL_RATE);
  }

  private buildDiagnosis(
    expectedPositionMs: number,
    actualPositionMs: number,
    driftMs: number,
    mode: CompensationMode,
    appliedPlaybackRate: number
  ): DriftDiagnosis {
    return {
      expectedPositionMs,
      actualPositionMs,
      driftMs: Math.round(driftMs),
      mode,
      appliedPlaybackRate,
      evaluatedAt: Date.now(),
    };
  }

  public startPeriodicCheck(intervalMs = 1500): void {
    this.stopPeriodicCheck();
    this.checkIntervalTimer = setInterval(() => {
      this.evaluateContinuous();
    }, intervalMs);
  }

  public stopPeriodicCheck(): void {
    if (this.checkIntervalTimer !== null) {
      clearInterval(this.checkIntervalTimer);
      this.checkIntervalTimer = null;
    }
  }

  public reset(): void {
    this.stopPeriodicCheck();
    this.lastEvaluatedSeq = -1;
    this.currentTarget = null;
    this.currentMode = "IN_SYNC";
    this.audio.setPlaybackRate(DriftCompensator.NORMAL_RATE);
  }
}
