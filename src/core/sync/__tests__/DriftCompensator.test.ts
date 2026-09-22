import { describe, it, expect, vi, beforeEach } from "vitest";
import { DriftCompensator, AudioControlTarget, SyncTargetState } from "../DriftCompensator";
import { ClockSync } from "../ClockSync";

describe("DriftCompensator (Dynamic Sub-100ms Playback Reconciliation)", () => {
  let mockAudio: AudioControlTarget;
  let mockClockSync: ClockSync;
  let currentAudioTime = 10.0; // 10,000ms
  let audioStatus: "PLAYING" | "PAUSED" | "STOPPED" = "PLAYING";

  beforeEach(() => {
    currentAudioTime = 10.0;
    audioStatus = "PLAYING";

    mockAudio = {
      getCurrentTime: vi.fn(() => currentAudioTime),
      seek: vi.fn((t) => {
        currentAudioTime = t;
      }),
      setPlaybackRate: vi.fn(),
      play: vi.fn(async () => {
        audioStatus = "PLAYING";
      }),
      pause: vi.fn(() => {
        audioStatus = "PAUSED";
      }),
      getStatus: vi.fn(() => audioStatus),
    };

    mockClockSync = {
      nowServer: vi.fn(() => 50000), // Server now = 50,000ms
      toServerTime: vi.fn((t) => t),
      toClientTime: vi.fn((t) => t),
      getMetrics: vi.fn(() => ({
        clockOffsetMs: 0,
        rttMs: 10,
        sampleCount: 4,
        lastSyncedAt: Date.now(),
        isCalibrated: true,
      })),
      calibrate: vi.fn(),
      destroy: vi.fn(),
    } as any;
  });

  it("maintains 1.0x rate when audio is in tight sync (< 25ms drift)", () => {
    const compensator = new DriftCompensator(mockAudio, mockClockSync);

    const target: SyncTargetState = {
      status: "PLAYING",
      positionMs: 9990, // 10ms behind local 10,000ms (within 25ms tolerance)
      serverTimestamp: 50000,
      seq: 1,
    };

    const diag = compensator.reconcile(target);

    expect(diag.mode).toBe("IN_SYNC");
    expect(diag.appliedPlaybackRate).toBe(1.0);
    expect(mockAudio.setPlaybackRate).toHaveBeenCalledWith(1.0);
    expect(mockAudio.seek).not.toHaveBeenCalled();
  });

  it("applies micro-speed-up (1.018x) when client is slightly behind (50ms drift)", () => {
    const compensator = new DriftCompensator(mockAudio, mockClockSync);

    // Audio is at 10,000ms, but target is at 10,060ms -> client is 60ms behind
    const target: SyncTargetState = {
      status: "PLAYING",
      positionMs: 10060,
      serverTimestamp: 50000,
      seq: 1,
    };

    const diag = compensator.reconcile(target);

    expect(diag.mode).toBe("MICRO_SPEED_UP");
    expect(diag.appliedPlaybackRate).toBe(DriftCompensator.SPEED_UP_RATE);
    expect(mockAudio.setPlaybackRate).toHaveBeenCalledWith(DriftCompensator.SPEED_UP_RATE);
    // Micro adjustments must NOT trigger jarring audio seek cuts
    expect(mockAudio.seek).not.toHaveBeenCalled();
  });

  it("applies micro-slow-down (0.982x) when client is slightly ahead (70ms drift)", () => {
    const compensator = new DriftCompensator(mockAudio, mockClockSync);

    // Audio is at 10,000ms, but target is at 9,930ms -> client is 70ms ahead
    const target: SyncTargetState = {
      status: "PLAYING",
      positionMs: 9930,
      serverTimestamp: 50000,
      seq: 1,
    };

    const diag = compensator.reconcile(target);

    expect(diag.mode).toBe("MICRO_SLOW_DOWN");
    expect(diag.appliedPlaybackRate).toBe(DriftCompensator.SLOW_DOWN_RATE);
    expect(mockAudio.setPlaybackRate).toHaveBeenCalledWith(DriftCompensator.SLOW_DOWN_RATE);
    expect(mockAudio.seek).not.toHaveBeenCalled();
  });

  it("executes hard seek when drift exceeds threshold (> 160ms)", () => {
    const compensator = new DriftCompensator(mockAudio, mockClockSync);

    // Audio is at 10,000ms, but target is at 25,000ms (15 seconds ahead)
    const target: SyncTargetState = {
      status: "PLAYING",
      positionMs: 25000,
      serverTimestamp: 50000,
      seq: 1,
    };

    const diag = compensator.reconcile(target);

    expect(diag.mode).toBe("HARD_SEEK");
    expect(mockAudio.seek).toHaveBeenCalledWith(25.0);
    expect(mockAudio.setPlaybackRate).toHaveBeenCalledWith(1.0);
  });

  it("rejects out-of-order stale sequence numbers", () => {
    const compensator = new DriftCompensator(mockAudio, mockClockSync);

    const firstTarget: SyncTargetState = {
      status: "PLAYING",
      positionMs: 15000,
      serverTimestamp: 50000,
      seq: 5,
    };
    compensator.reconcile(firstTarget);

    // Stale sequence number 4 arrives late over network
    const staleTarget: SyncTargetState = {
      status: "PLAYING",
      positionMs: 2000,
      serverTimestamp: 50000,
      seq: 4,
    };
    compensator.reconcile(staleTarget);

    // Verify seek was NOT called for the stale packet
    expect(mockAudio.seek).not.toHaveBeenCalledWith(2.0);
  });
});
