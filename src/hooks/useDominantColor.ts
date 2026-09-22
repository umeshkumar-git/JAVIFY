/**
 * @file useDominantColor.ts
 * @description Dynamic Album Artwork Color Extraction Hook (Apple Music-style ambiance).
 *
 * Performance Architecture:
 * - Downsamples image to a 48x48 offscreen canvas for O(W*H) = O(2304) instant pixel analysis (<3ms).
 * - Filters out near-black (shadow borders) and blown-out white pixels to capture vibrant musical hues.
 * - YIQ luminance calculation ensures optimal text contrast.
 * - Global memoized color cache prevents re-extraction on previously visited artwork.
 */

import { useState, useEffect } from "react";

export interface ExtractedPalette {
  /** Primary dominant color in hex format (e.g. "#8B5CF6") */
  primaryHex: string;
  /** Secondary complementary accent color for badges/highlights */
  accentHex: string;
  /** Full Apple Music-style dynamic background CSS gradient */
  gradientCss: string;
  /** Soft ambient glow CSS string for shadows/borders */
  glowCss: string;
  /** True if the extracted color is dark (requiring light foreground text) */
  isDark: boolean;
}

const DEFAULT_PALETTE: ExtractedPalette = {
  primaryHex: "#00F5FF",
  accentHex: "#8B5CF6",
  gradientCss:
    "radial-gradient(circle at 50% -20%, rgba(0, 245, 255, 0.18) 0%, rgba(9, 14, 26, 0.85) 60%, #050811 100%)",
  glowCss: "0 0 40px -10px rgba(0, 245, 255, 0.35)",
  isDark: true,
};

// Global memoization cache for extracted palettes
const paletteCache = new Map<string, ExtractedPalette>();

/**
 * Converts RGB numbers to 6-character hex string.
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    return clamped.toString(16).padStart(2, "0");
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Calculates perceived brightness using ITU-R BT.601 standard.
 * Returns true if the color is perceived as dark (luminance < 130).
 */
function isColorDark(r: number, g: number, b: number): boolean {
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq < 130;
}

/**
 * Creates an accent color by boosting saturation and shifting hue.
 */
function computeAccentColor(r: number, g: number, b: number): string {
  const accentR = Math.min(255, Math.round(r * 1.35));
  const accentG = Math.min(255, Math.round(g * 1.2));
  const accentB = Math.min(255, Math.round(b * 1.4 + 30));
  return rgbToHex(accentR, accentG, accentB);
}

/**
 * Analyzes pixel data from an HTMLCanvasElement to extract dominant color.
 */
export function extractDominantColorFromCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): ExtractedPalette {
  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Color quantization bucket map
  const colorBuckets = new Map<string, { count: number; r: number; g: number; b: number }>();

  // Quantization step: downsample color resolution by rounding to nearest multiple of 16
  const QUANTIZE_STEP = 16;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Ignore transparent pixels
    if (a < 128) continue;

    // Filter out extreme near-black (< 35 total) and blown-out near-white (> 235 each)
    const brightness = r + g + b;
    if (brightness < 35 || (r > 235 && g > 235 && b > 235)) continue;

    // Quantized key
    const qr = Math.round(r / QUANTIZE_STEP) * QUANTIZE_STEP;
    const qg = Math.round(g / QUANTIZE_STEP) * QUANTIZE_STEP;
    const qb = Math.round(b / QUANTIZE_STEP) * QUANTIZE_STEP;
    const key = `${qr},${qg},${qb}`;

    const existing = colorBuckets.get(key);
    if (existing) {
      existing.count++;
    } else {
      colorBuckets.set(key, { count: 1, r: qr, g: qg, b: qb });
    }
  }

  // Find most frequent color bucket
  let maxCount = 0;
  let dominant = { r: 0, g: 245, b: 255 }; // fallback neon cyan

  for (const bucket of colorBuckets.values()) {
    if (bucket.count > maxCount) {
      maxCount = bucket.count;
      dominant = { r: bucket.r, g: bucket.g, b: bucket.b };
    }
  }

  const primaryHex = rgbToHex(dominant.r, dominant.g, dominant.b);
  const accentHex = computeAccentColor(dominant.r, dominant.g, dominant.b);
  const isDark = isColorDark(dominant.r, dominant.g, dominant.b);

  const gradientCss = `radial-gradient(circle at 50% -20%, rgba(${dominant.r}, ${dominant.g}, ${dominant.b}, 0.28) 0%, rgba(9, 14, 26, 0.90) 65%, #050811 100%)`;
  const glowCss = `0 0 50px -10px rgba(${dominant.r}, ${dominant.g}, ${dominant.b}, 0.4)`;

  return {
    primaryHex,
    accentHex,
    gradientCss,
    glowCss,
    isDark,
  };
}

/**
 * Custom React Hook to dynamically extract the dominant ambient color and Apple Music-style
 * background gradient from an image URL.
 *
 * @param imageUrl The URL of the album artwork.
 * @param fallback Optional custom fallback palette.
 * @returns Object with extracted palette, gradient CSS, and loading state.
 */
export function useDominantColor(
  imageUrl?: string | null,
  fallback: ExtractedPalette = DEFAULT_PALETTE
): {
  palette: ExtractedPalette;
  isLoading: boolean;
} {
  const [palette, setPalette] = useState<ExtractedPalette>(() => {
    if (imageUrl && paletteCache.has(imageUrl)) {
      return paletteCache.get(imageUrl)!;
    }
    return fallback;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!imageUrl) {
      setPalette(fallback);
      return;
    }

    // Cache hit
    if (paletteCache.has(imageUrl)) {
      setPalette(paletteCache.get(imageUrl)!);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const SIZED = 48; // Downsample for sub-3ms analysis
        canvas.width = SIZED;
        canvas.height = SIZED;

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          if (isMounted) {
            setPalette(fallback);
            setIsLoading(false);
          }
          return;
        }

        ctx.drawImage(img, 0, 0, SIZED, SIZED);
        const extracted = extractDominantColorFromCanvas(canvas, ctx);

        paletteCache.set(imageUrl, extracted);

        if (isMounted) {
          setPalette(extracted);
          setIsLoading(false);
        }
      } catch (err) {
        // CORS tainted canvas or error: fallback gracefully
        console.warn("[useDominantColor] Canvas extraction error, using fallback:", err);
        if (isMounted) {
          paletteCache.set(imageUrl, fallback);
          setPalette(fallback);
          setIsLoading(false);
        }
      }
    };

    img.onerror = () => {
      if (isMounted) {
        setPalette(fallback);
        setIsLoading(false);
      }
    };

    img.src = imageUrl;

    return () => {
      isMounted = false;
    };
  }, [imageUrl, fallback]);

  return { palette, isLoading };
}
