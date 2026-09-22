import { useState, useEffect, useRef, type ImgHTMLAttributes } from "react";

/**
 * Global in-memory cache of successfully decoded image URLs.
 * Prevents skeleton re-flashing when recycled DOM nodes revisit previously loaded album covers.
 */
export const globalDecodedCache = new Set<string>();

/**
 * Transforms standard image URLs into modern next-gen WebP format URLs with quality optimization.
 */
export function transformToWebP(url: string, width = 200, quality = 80): string {
  if (!url) return "";

  try {
    // Unsplash dynamic image service
    if (url.includes("images.unsplash.com")) {
      const parsed = new URL(url);
      parsed.searchParams.set("fm", "webp");
      parsed.searchParams.set("auto", "format");
      parsed.searchParams.set("fit", "crop");
      parsed.searchParams.set("w", String(width));
      parsed.searchParams.set("q", String(quality));
      return parsed.toString();
    }

    // Cloudinary dynamic image delivery
    if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
      return url.replace("/upload/", `/upload/f_webp,q_${quality},w_${width},c_fill/`);
    }

    return url;
  } catch {
    return url;
  }
}

export interface AdaptiveImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src?: string;
  alt: string;
  fallbackIconText?: string;
  rootMargin?: string;
  width?: number;
  quality?: number;
  skeletonClassName?: string;
}

/**
 * Enterprise Adaptive Image Loader.
 * - IntersectionObserver lazy loading with pre-scroll anticipation threshold.
 * - Dynamic format negotiation to modern WebP.
 * - Hardware-accelerated async image decoding (HTMLImageElement.decode()) to eliminate paint jank.
 * - Animated shimmering skeleton placeholder.
 * - Zero-flicker global memory decode cache for recycled virtual lists.
 */
export function AdaptiveImage({
  src,
  alt,
  fallbackIconText,
  rootMargin = "120px",
  width = 160,
  quality = 80,
  className = "",
  skeletonClassName = "",
  ...imgProps
}: AdaptiveImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const targetWebPUrl = src ? transformToWebP(src, width, quality) : "";

  const isAlreadyDecoded = targetWebPUrl ? globalDecodedCache.has(targetWebPUrl) : false;

  const [isVisible, setIsVisible] = useState(isAlreadyDecoded);
  const [isLoaded, setIsLoaded] = useState(isAlreadyDecoded);
  const [hasError, setHasError] = useState(false);

  // 1. Intersection Observer for delayed viewport loading
  useEffect(() => {
    if (isLoaded || isVisible || !targetWebPUrl) return;

    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setIsVisible(true);
      return;
    }

    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [targetWebPUrl, isLoaded, isVisible, rootMargin]);

  // 2. Hardware-accelerated decode when visible
  useEffect(() => {
    if (!isVisible || isLoaded || !targetWebPUrl) return;

    let isCancelled = false;
    const img = new Image();
    img.src = targetWebPUrl;

    const finalizeSuccess = () => {
      if (isCancelled) return;
      globalDecodedCache.add(targetWebPUrl);
      setIsLoaded(true);
      setHasError(false);
    };

    const finalizeError = () => {
      if (isCancelled) return;
      setHasError(true);
      setIsLoaded(true);
    };

    if (typeof img.decode === "function") {
      img
        .decode()
        .then(finalizeSuccess)
        .catch(() => {
          // Fallback to traditional onload if decode fails
          img.onload = finalizeSuccess;
          img.onerror = finalizeError;
        });
    } else {
      img.onload = finalizeSuccess;
      img.onerror = finalizeError;
    }

    return () => {
      isCancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [isVisible, isLoaded, targetWebPUrl]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      data-testid="adaptive-image-container"
    >
      {/* Shimmering Skeleton Screen */}
      {!isLoaded && !hasError && (
        <div
          className={`absolute inset-0 bg-gradient-to-r from-slate-800 via-slate-700/80 to-slate-800 animate-pulse ${skeletonClassName}`}
          data-testid="adaptive-image-skeleton"
        />
      )}

      {/* Error Fallback Badge */}
      {(hasError || !src) && (
        <div
          className="flex h-full w-full items-center justify-center bg-slate-800/90 text-slate-400 font-mono text-xs select-none"
          title={alt}
          data-testid="adaptive-image-fallback"
        >
          {fallbackIconText ? (
            <span className="font-bold">{fallbackIconText.slice(0, 2).toUpperCase()}</span>
          ) : (
            <svg className="h-4 w-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
          )}
        </div>
      )}

      {/* Asynchronously Decoded Modern WebP Image with Smooth Fade-in */}
      {isVisible && !hasError && targetWebPUrl && (
        <picture>
          <source type="image/webp" srcSet={targetWebPUrl} />
          <img
            {...imgProps}
            src={targetWebPUrl}
            alt={alt}
            decoding="async"
            className={`h-full w-full object-cover transition-opacity duration-300 ease-out ${
              isLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
        </picture>
      )}
    </div>
  );
}
