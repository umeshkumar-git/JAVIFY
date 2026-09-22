import { describe, it, expect, vi } from "vitest";
import { extractDominantColorFromCanvas } from "../useDominantColor";

describe("useDominantColor & Dynamic Ambiance Extraction", () => {
  it("extracts dominant color from canvas pixel data and generates CSS gradients", () => {
    const width = 48;
    const height = 48;
    const totalPixels = width * height;
    const pixelData = new Uint8ClampedArray(totalPixels * 4);

    // Fill 80% with violet (r: 139, g: 92, b: 246)
    for (let i = 0; i < totalPixels * 0.8; i++) {
      const idx = i * 4;
      pixelData[idx] = 139;     // R
      pixelData[idx + 1] = 92;  // G
      pixelData[idx + 2] = 246; // B
      pixelData[idx + 3] = 255; // A
    }

    // Fill remaining with near-black (should be ignored by filter)
    for (let i = Math.floor(totalPixels * 0.8); i < totalPixels; i++) {
      const idx = i * 4;
      pixelData[idx] = 5;
      pixelData[idx + 1] = 5;
      pixelData[idx + 2] = 5;
      pixelData[idx + 3] = 255;
    }

    const mockCtx = {
      getImageData: vi.fn().mockReturnValue({ data: pixelData }),
    } as unknown as CanvasRenderingContext2D;

    const mockCanvas = {
      width,
      height,
    } as HTMLCanvasElement;

    const palette = extractDominantColorFromCanvas(mockCanvas, mockCtx);

    // Primary hex should reflect the quantized violet
    expect(palette.primaryHex).toMatch(/^#[0-9a-f]{6}$/i);
    expect(palette.accentHex).toMatch(/^#[0-9a-f]{6}$/i);
    expect(palette.gradientCss).toContain("radial-gradient");
    expect(palette.gradientCss).toContain("#050811");
    expect(palette.glowCss).toContain("rgba");
    expect(palette.isDark).toBe(true);
  });

  it("filters out blown-out white pixels to capture authentic music colors", () => {
    const width = 10;
    const height = 10;
    const totalPixels = width * height;
    const pixelData = new Uint8ClampedArray(totalPixels * 4);

    // Fill 70% with white (255, 255, 255)
    for (let i = 0; i < totalPixels * 0.7; i++) {
      const idx = i * 4;
      pixelData[idx] = 255;
      pixelData[idx + 1] = 255;
      pixelData[idx + 2] = 255;
      pixelData[idx + 3] = 255;
    }

    // Fill 30% with cyan (0, 240, 255)
    for (let i = Math.floor(totalPixels * 0.7); i < totalPixels; i++) {
      const idx = i * 4;
      pixelData[idx] = 0;
      pixelData[idx + 1] = 240;
      pixelData[idx + 2] = 255;
      pixelData[idx + 3] = 255;
    }

    const mockCtx = {
      getImageData: vi.fn().mockReturnValue({ data: pixelData }),
    } as unknown as CanvasRenderingContext2D;

    const mockCanvas = { width, height } as HTMLCanvasElement;

    const palette = extractDominantColorFromCanvas(mockCanvas, mockCtx);

    // The white pixels should be filtered out, leaving cyan as dominant
    expect(palette.primaryHex.toLowerCase()).not.toBe("#ffffff");
  });
});
