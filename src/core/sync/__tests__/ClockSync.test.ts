import { describe, it, expect, vi } from "vitest";
import { ClockSync, PingSender } from "../ClockSync";

describe("ClockSync (NTP Protocol Drift Compensation)", () => {
  it("accurately calculates clock offset and RTT from ping-pong timestamps", async () => {
    // Simulated server clock is 500ms ahead of client
    const SERVER_AHEAD_MS = 500;
    const NETWORK_ONE_WAY_LATENCY_MS = 25;

    const mockPingSender: PingSender = vi.fn(async ({ clientSendTime }) => {
      const serverReceiveTime = clientSendTime + SERVER_AHEAD_MS + NETWORK_ONE_WAY_LATENCY_MS;
      const serverTransmitTime = serverReceiveTime + 2; // 2ms server processing
      return {
        clientSendTime,
        serverReceiveTime,
        serverTransmitTime,
      };
    });

    const clockSync = new ClockSync(mockPingSender, 4, 100000);
    const metrics = await clockSync.calibrate();

    expect(metrics.isCalibrated).toBe(true);
    // Calculated offset should be very close to the true server lead (+500ms)
    expect(metrics.clockOffsetMs).toBeGreaterThanOrEqual(480);
    expect(metrics.clockOffsetMs).toBeLessThanOrEqual(540);

    // Verify time conversion
    const localNow = 10000;
    const serverEstimated = clockSync.toServerTime(localNow);
    expect(serverEstimated).toBe(localNow + metrics.clockOffsetMs);

    const clientConvertedBack = clockSync.toClientTime(serverEstimated);
    expect(clientConvertedBack).toBe(localNow);

    clockSync.destroy();
  });

  it("filters out network jitter spikes by taking the lowest RTT samples", async () => {
    let callCount = 0;
    const mockPingSender: PingSender = vi.fn(async ({ clientSendTime }) => {
      callCount++;
      // Inject huge network spike on call 2 and 3
      const latency = callCount === 2 || callCount === 3 ? 300 : 20;
      return {
        clientSendTime,
        serverReceiveTime: clientSendTime + 100 + latency,
        serverTransmitTime: clientSendTime + 100 + latency + 1,
      };
    });

    const clockSync = new ClockSync(mockPingSender, 6, 100000);
    const metrics = await clockSync.calibrate();

    expect(metrics.isCalibrated).toBe(true);
    // Best RTT should reflect the stable 20ms connection (~40ms round trip), not 300ms spike
    expect(metrics.rttMs).toBeLessThan(100);

    clockSync.destroy();
  });
});
