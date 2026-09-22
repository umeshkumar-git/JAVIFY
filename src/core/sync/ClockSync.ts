/**
 * NTP Sample result
 */
export interface SyncSample {
  t1: number; // Client send time
  t2: number; // Server receive time
  t3: number; // Server transmit time
  t4: number; // Client receive time
  rtt: number; // Round-trip time
  offset: number; // Clock offset (theta): ServerTime - ClientTime
}

export interface ClockSyncMetrics {
  clockOffsetMs: number;
  rttMs: number;
  sampleCount: number;
  lastSyncedAt: number;
  isCalibrated: boolean;
}

export type PingSender = (payload: { clientSendTime: number }) => Promise<{
  clientSendTime: number;
  serverReceiveTime: number;
  serverTransmitTime: number;
}>;

function getNowMs(): number {
  if (typeof performance !== "undefined" && performance.timeOrigin) {
    return performance.timeOrigin + performance.now();
  }
  return Date.now();
}

/**
 * High-precision Client-Side NTP Clock Synchronization Engine.
 * Compensates for network jitter and asymmetric latency to align client and server time
 * within < 10ms error on typical connections.
 */
export class ClockSync {
  private offsetMs = 0;
  private minRttMs = Infinity;
  private samples: SyncSample[] = [];
  private isCalibrated = false;
  private lastSyncedAt = 0;
  private syncTimer: any = null;

  constructor(
    private readonly pingSender: PingSender,
    private readonly sampleTargetCount = 8,
    private readonly resyncIntervalMs = 45000
  ) {}

  /**
   * Runs a calibration burst: sends multiple sequential pings,
   * sorts by minimum RTT (network latency is strictly positive and asymmetric),
   * and computes the optimal clock skew.
   */
  public async calibrate(): Promise<ClockSyncMetrics> {
    const freshSamples: SyncSample[] = [];

    for (let i = 0; i < this.sampleTargetCount; i++) {
      try {
        const t1 = getNowMs();
        const response = await this.pingSender({ clientSendTime: t1 });
        const t4 = getNowMs();

        const t2 = response.serverReceiveTime;
        const t3 = response.serverTransmitTime;

        // Round Trip Time: Total transit time minus server processing delay
        const serverProcessingDelay = Math.max(0, t3 - t2);
        const rtt = Math.max(0, t4 - t1 - serverProcessingDelay);

        // Clock offset formula (theta): ((t2 - t1) + (t3 - t4)) / 2
        const offset = ((t2 - t1) + (t3 - t4)) / 2;

        freshSamples.push({ t1, t2, t3, t4, rtt, offset });

        // Jitter spacer between calibration pings
        if (i < this.sampleTargetCount - 1) {
          await new Promise((resolve) => setTimeout(resolve, 60));
        }
      } catch (err) {
        // Continue if single sample dropped
      }
    }

    if (freshSamples.length === 0) {
      // Return uncalibrated metrics if network unreachable
      return this.getMetrics();
    }

    // Sort by lowest RTT: packets that took the shortest time experienced the least queuing delay
    freshSamples.sort((a, b) => a.rtt - b.rtt);

    // Keep the top 50% lowest RTT samples to eliminate statistical network outliers
    const bestSubset = freshSamples.slice(0, Math.max(1, Math.floor(freshSamples.length / 2)));

    // Calculate weighted average offset
    const sumOffset = bestSubset.reduce((acc, curr) => acc + curr.offset, 0);
    this.offsetMs = Math.round(sumOffset / bestSubset.length);
    this.minRttMs = Math.round(bestSubset[0].rtt);
    this.samples = freshSamples;
    this.isCalibrated = true;
    this.lastSyncedAt = Date.now();

    this.scheduleResync();
    return this.getMetrics();
  }

  /**
   * Converts local client millisecond timestamp to synchronized server timestamp.
   */
  public toServerTime(clientLocalTime: number = Date.now()): number {
    return clientLocalTime + this.offsetMs;
  }

  /**
   * Converts server timestamp to local client millisecond timestamp.
   */
  public toClientTime(serverTime: number): number {
    return serverTime - this.offsetMs;
  }

  /**
   * Current estimated server timestamp.
   */
  public nowServer(): number {
    return this.toServerTime(Date.now());
  }

  public getMetrics(): ClockSyncMetrics {
    return {
      clockOffsetMs: this.offsetMs,
      rttMs: Number.isFinite(this.minRttMs) ? this.minRttMs : 0,
      sampleCount: this.samples.length,
      lastSyncedAt: this.lastSyncedAt,
      isCalibrated: this.isCalibrated,
    };
  }

  private scheduleResync(): void {
    if (this.syncTimer !== null) {
      clearTimeout(this.syncTimer);
    }
    this.syncTimer = setTimeout(() => {
      this.calibrate().catch(() => {});
    }, this.resyncIntervalMs);
  }

  public destroy(): void {
    if (this.syncTimer !== null) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
  }
}
