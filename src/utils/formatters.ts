/**
 * Enterprise Audio & Storage Formatting Utilities.
 * Deterministic, edge-case resilient formatting with full unit test coverage.
 */

/**
 * Formats a duration in seconds into standard audio playback string representation (mm:ss or hh:mm:ss).
 *
 * @param seconds - Duration in seconds
 * @returns Formatted time string (e.g., "3:45", "1:02:15", "0:00")
 */
export function formatDuration(seconds: number): string {
  if (typeof seconds !== "number" || isNaN(seconds) || seconds <= 0 || !isFinite(seconds)) {
    return "0:00";
  }

  const totalSecs = Math.floor(seconds);
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const paddedSecs = secs < 10 ? `0${secs}` : `${secs}`;

  if (hours > 0) {
    const paddedMins = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hours}:${paddedMins}:${paddedSecs}`;
  }

  return `${minutes}:${paddedSecs}`;
}

/**
 * Converts a raw byte count into human-readable storage units (B, KB, MB, GB, TB).
 *
 * @param bytes - Size in bytes
 * @param decimals - Decimal places (default 1)
 * @returns Human-readable string (e.g., "14.2 MB", "1.5 GB")
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (typeof bytes !== "number" || isNaN(bytes) || bytes <= 0 || !isFinite(bytes)) {
    return "0 B";
  }

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const clampedIndex = Math.min(i, sizes.length - 1);

  return `${parseFloat((bytes / Math.pow(k, clampedIndex)).toFixed(dm))} ${sizes[clampedIndex]}`;
}

/**
 * Formats audio stream bitrate.
 *
 * @param kbps - Bitrate in kilobits per second
 * @returns Formatted string (e.g., "320 kbps")
 */
export function formatBitrate(kbps: number): string {
  if (typeof kbps !== "number" || isNaN(kbps) || kbps <= 0) {
    return "Variable";
  }
  return `${Math.round(kbps)} kbps`;
}
