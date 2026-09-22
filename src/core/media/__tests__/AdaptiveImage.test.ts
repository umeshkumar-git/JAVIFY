import { describe, it, expect, beforeEach } from "vitest";
import { transformToWebP, globalDecodedCache } from "../AdaptiveImage";

describe("AdaptiveImage & Modern WebP Format Engine", () => {
  beforeEach(() => {
    globalDecodedCache.clear();
  });

  it("dynamically converts Unsplash image URLs to modern WebP with custom dimensions and quality", () => {
    const originalUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80";
    const webpUrl = transformToWebP(originalUrl, 120, 75);

    expect(webpUrl).toContain("fm=webp");
    expect(webpUrl).toContain("w=120");
    expect(webpUrl).toContain("q=75");
    expect(webpUrl).toContain("auto=format");
  });

  it("dynamically converts Cloudinary URLs to modern f_webp format", () => {
    const originalUrl = "https://res.cloudinary.com/demo/image/upload/sample.jpg";
    const webpUrl = transformToWebP(originalUrl, 250, 85);

    expect(webpUrl).toBe("https://res.cloudinary.com/demo/image/upload/f_webp,q_85,w_250,c_fill/sample.jpg");
  });

  it("gracefully preserves non-CDN URLs without breaking", () => {
    const localUrl = "/assets/album-cover.png";
    expect(transformToWebP(localUrl)).toBe(localUrl);

    const emptyUrl = "";
    expect(transformToWebP(emptyUrl)).toBe("");
  });

  it("registers decoded items into the global decode cache to prevent skeleton flicker", () => {
    const testUrl = "https://images.unsplash.com/photo-test?w=200";
    const webpUrl = transformToWebP(testUrl);

    expect(globalDecodedCache.has(webpUrl)).toBe(false);
    globalDecodedCache.add(webpUrl);
    expect(globalDecodedCache.has(webpUrl)).toBe(true);
  });
});
