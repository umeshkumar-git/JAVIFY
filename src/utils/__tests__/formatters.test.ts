import { describe, it, expect } from "vitest";
import { formatDuration, formatBytes, formatBitrate } from "../formatters";

describe("formatters (Audio & Storage Utility Functions)", () => {
  describe("formatDuration", () => {
    it("formats standard minutes and seconds correctly", () => {
      expect(formatDuration(0)).toBe("0:00");
      expect(formatDuration(5)).toBe("0:05");
      expect(formatDuration(45)).toBe("0:45");
      expect(formatDuration(60)).toBe("1:00");
      expect(formatDuration(184)).toBe("3:04");
      expect(formatDuration(3599)).toBe("59:59");
    });

    it("formats hours, minutes, and seconds for long-form streams", () => {
      expect(formatDuration(3600)).toBe("1:00:00");
      expect(formatDuration(3665)).toBe("1:01:05");
      expect(formatDuration(7325)).toBe("2:02:05");
    });

    it("gracefully handles invalid, negative, decimal, and non-numeric inputs", () => {
      expect(formatDuration(-10)).toBe("0:00");
      expect(formatDuration(NaN)).toBe("0:00");
      expect(formatDuration(Infinity)).toBe("0:00");
      expect(formatDuration(184.72)).toBe("3:04");
      expect(formatDuration("invalid" as unknown as number)).toBe("0:00");
    });
  });

  describe("formatBytes", () => {
    it("formats bytes, kilobytes, megabytes, and gigabytes accurately", () => {
      expect(formatBytes(0)).toBe("0 B");
      expect(formatBytes(512)).toBe("512 B");
      expect(formatBytes(1024)).toBe("1 KB");
      expect(formatBytes(1048576)).toBe("1 MB");
      expect(formatBytes(5242880)).toBe("5 MB");
      expect(formatBytes(1073741824)).toBe("1 GB");
      expect(formatBytes(15728640, 2)).toBe("15 MB");
    });

    it("gracefully handles edge cases", () => {
      expect(formatBytes(-100)).toBe("0 B");
      expect(formatBytes(NaN)).toBe("0 B");
      expect(formatBytes(Infinity)).toBe("0 B");
    });
  });

  describe("formatBitrate", () => {
    it("formats audio stream bitrates", () => {
      expect(formatBitrate(320)).toBe("320 kbps");
      expect(formatBitrate(256.4)).toBe("256 kbps");
      expect(formatBitrate(0)).toBe("Variable");
      expect(formatBitrate(-128)).toBe("Variable");
      expect(formatBitrate(NaN)).toBe("Variable");
    });
  });
});
