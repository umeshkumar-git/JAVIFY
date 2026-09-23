import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  memo,
} from "react";
import { useAudioStore } from "../../store/useAudioStore";
import { formatDuration } from "../../utils/formatters";

export interface ProgressBarProps {
  /**
   * Optional custom CSS class for the root wrapper.
   */
  className?: string;
  /**
   * Whether to display numerical timestamps for current time and total duration.
   * @default true
   */
  showTimeLabels?: boolean;
  /**
   * Callback fired when seeking completes (pointer up / key commit).
   * Ideal for syncing with multiplayer rooms or analytics.
   */
  onSeekEnd?: (seconds: number) => void;
  /**
   * Callback fired during active dragging.
   */
  onSeekChange?: (seconds: number) => void;
  /**
   * Size variant adjusting track height.
   * @default "md"
   */
  size?: "sm" | "md" | "lg";
}

/**
 * 60FPS Production-Grade Audio Scrubber & Progress Bar.
 *
 * Architecture & Performance Guarantees:
 * 1. Zero Parent Re-renders:
 *    - Parent components never subscribe to `currentTime`.
 *    - Uses atomic Zustand selectors (`isPlaying`, `duration`) that update rarely.
 * 2. 60FPS Direct DOM Animation Loop:
 *    - Updates fill width, thumb position, and time readout via DOM refs inside
 *      a `requestAnimationFrame` loop, bypassing React's Virtual DOM reconciliation.
 * 3. Glitch-Free Scrubbing:
 *    - Pointer capture API handles drag seamlessly even if cursor exits bounds.
 *    - Regular audio updates are paused during drag.
 *    - `store.seek()` only fires on pointer release (`pointerup`), avoiding audio decoding stutter.
 * 4. WAI-ARIA Accessible:
 *    - Full slider role, aria-valuenow, aria-valuetext, and keyboard navigation.
 */
export const ProgressBar = memo(function ProgressBar({
  className = "",
  showTimeLabels = true,
  onSeekEnd,
  onSeekChange,
  size = "md",
}: ProgressBarProps) {
  // Atomic Zustand subscriptions: Only re-render if playback status or track length changes
  const duration = useAudioStore((s) => s.duration);
  const isPlaying = useAudioStore((s) => s.isPlaying);

  // Direct DOM references for 60FPS transient manipulation
  const trackRef = useRef<HTMLDivElement | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const currentTimeTextRef = useRef<HTMLSpanElement | null>(null);
  const durationTextRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  // Interaction tracking refs
  const isDraggingRef = useRef(false);
  const dragRatioRef = useRef(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  /**
   * Synchronizes visual elements directly through DOM refs.
   * Runs at 60FPS without incurring React render cycles.
   */
  const updateVisualProgress = useCallback(
    (seconds: number, totalSeconds: number) => {
      const validTotal = totalSeconds > 0 ? totalSeconds : 0;
      const clampedSeconds = Math.max(0, Math.min(seconds, validTotal || seconds));
      const ratio = validTotal > 0 ? clampedSeconds / validTotal : 0;
      const percentage = `${(ratio * 100).toFixed(2)}%`;

      if (fillRef.current) {
        fillRef.current.style.width = percentage;
      }
      if (thumbRef.current) {
        thumbRef.current.style.left = percentage;
      }
      if (currentTimeTextRef.current) {
        currentTimeTextRef.current.textContent = formatDuration(clampedSeconds);
      }
      if (trackRef.current) {
        trackRef.current.setAttribute("aria-valuenow", String(Math.floor(clampedSeconds)));
        trackRef.current.setAttribute("aria-valuetext", formatDuration(clampedSeconds));
      }
    },
    []
  );

  /**
   * 60FPS requestAnimationFrame playback sync loop.
   * Active only when audio is playing, idling when paused to preserve battery.
   */
  useEffect(() => {
    let rafId: number | null = null;

    const frameLoop = () => {
      if (!isDraggingRef.current) {
        const store = useAudioStore.getState();
        const pipeline = store.pipeline;
        const current = pipeline?.getCurrentTime() ?? store.currentTime;
        const total = duration > 0 ? duration : (pipeline?.getDuration() ?? store.duration);
        updateVisualProgress(current, total);
      }
      rafId = requestAnimationFrame(frameLoop);
    };

    if (isPlaying) {
      rafId = requestAnimationFrame(frameLoop);
    } else {
      // One-off sync when paused to maintain visual fidelity
      const store = useAudioStore.getState();
      updateVisualProgress(store.currentTime, duration);
    }

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [isPlaying, duration, updateVisualProgress]);

  // Keep duration label up to date
  useEffect(() => {
    if (durationTextRef.current) {
      durationTextRef.current.textContent = formatDuration(duration);
    }
    if (trackRef.current) {
      trackRef.current.setAttribute("aria-valuemax", String(Math.floor(duration)));
    }
  }, [duration]);

  // Handle external seek events when paused (e.g. next track or reset)
  useEffect(() => {
    const unsubscribe = useAudioStore.subscribe(
      (state) => state.currentTime,
      (newTime) => {
        if (!isDraggingRef.current && !isPlaying) {
          updateVisualProgress(newTime, duration);
        }
      }
    );
    return unsubscribe;
  }, [isPlaying, duration, updateVisualProgress]);

  /**
   * Calculates normalized ratio [0, 1] from pointer event coordinates.
   */
  const getRatioFromPointer = useCallback((clientX: number): number => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    const rawX = clientX - rect.left;
    return Math.max(0, Math.min(1, rawX / rect.width));
  }, []);

  /**
   * Pointer Down - Initiates scrub gesture & pauses listener interference.
   */
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Primary mouse button only
    e.preventDefault();

    const track = trackRef.current;
    if (!track) return;

    track.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    setIsDragging(true);

    const ratio = getRatioFromPointer(e.clientX);
    dragRatioRef.current = ratio;

    const targetSeconds = ratio * duration;
    updateVisualProgress(targetSeconds, duration);
    onSeekChange?.(targetSeconds);
  };

  /**
   * Pointer Move - 60FPS fluid scrubbing & hover tooltip positioning.
   */
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const ratio = getRatioFromPointer(e.clientX);

    // Update hover preview tooltip
    if (tooltipRef.current) {
      tooltipRef.current.style.left = `${(ratio * 100).toFixed(2)}%`;
      tooltipRef.current.textContent = formatDuration(ratio * duration);
    }

    if (!isDraggingRef.current) return;

    dragRatioRef.current = ratio;
    const targetSeconds = ratio * duration;
    updateVisualProgress(targetSeconds, duration);
    onSeekChange?.(targetSeconds);
  };

  /**
   * Pointer Up - Commits final seek to the audio store.
   * Prevents audio glitching by seeking once on gesture release.
   */
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;

    isDraggingRef.current = false;
    setIsDragging(false);

    try {
      trackRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture already ended
    }

    const finalRatio = dragRatioRef.current;
    const finalSeconds = finalRatio * duration;

    // Dispatch commit to Zustand AudioStore
    useAudioStore.getState().seek(finalSeconds);
    onSeekEnd?.(finalSeconds);
  };

  /**
   * Handles edge cases when pointer capture is cancelled by OS/browser.
   */
  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    try {
      trackRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // No-op
    }
  };

  /**
   * WAI-ARIA Keyboard navigation support.
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (duration <= 0) return;

    const store = useAudioStore.getState();
    const current = store.currentTime;
    let target = current;
    let handled = false;

    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        target = Math.min(duration, current + 5);
        handled = true;
        break;
      case "ArrowLeft":
      case "ArrowDown":
        target = Math.max(0, current - 5);
        handled = true;
        break;
      case "PageUp":
        target = Math.min(duration, current + 15);
        handled = true;
        break;
      case "PageDown":
        target = Math.max(0, current - 15);
        handled = true;
        break;
      case "Home":
        target = 0;
        handled = true;
        break;
      case "End":
        target = duration;
        handled = true;
        break;
      default:
        break;
    }

    if (handled) {
      e.preventDefault();
      store.seek(target);
      updateVisualProgress(target, duration);
      onSeekEnd?.(target);
    }
  };

  // Height token based on size variant
  const trackHeight = {
    sm: "h-1 group-hover:h-1.5",
    md: "h-1.5 group-hover:h-2",
    lg: "h-2 group-hover:h-2.5",
  }[size];

  return (
    <div
      className={`flex w-full items-center gap-3 select-none ${className}`}
      data-testid="audio-progress-bar"
    >
      {/* Current Elapsed Time */}
      {showTimeLabels && (
        <span
          ref={currentTimeTextRef}
          className="w-10 text-right font-mono text-[11px] text-slate-400 tabular-nums shrink-0"
          data-testid="progress-current-time"
        >
          0:00
        </span>
      )}

      {/* Interactive Track Area */}
      <div
        className="group relative flex-1 flex items-center py-2 -my-2 cursor-pointer touch-none"
        onPointerEnter={() => setIsHovered(true)}
        onPointerLeave={() => setIsHovered(false)}
      >
        {/* Floating Hover Tooltip */}
        <div
          ref={tooltipRef}
          aria-hidden="true"
          className={`absolute -top-7 -translate-x-1/2 pointer-events-none rounded bg-midnight-900/95 border border-white/10 px-2 py-0.5 font-mono text-[10px] text-neon-cyan shadow-glass-sm backdrop-blur-md transition-opacity duration-150 ${
            isHovered || isDragging ? "opacity-100" : "opacity-0"
          }`}
        >
          0:00
        </div>

        {/* Accessible Slider Element */}
        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label="Audio progress scrubber"
          aria-valuemin={0}
          aria-valuemax={Math.floor(duration)}
          aria-valuenow={0}
          aria-valuetext="0:00"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onKeyDown={handleKeyDown}
          className={`relative w-full rounded-full bg-slate-800/80 backdrop-blur-xs transition-[height] duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/80 focus-visible:ring-offset-2 focus-visible:ring-offset-midnight-950 ${trackHeight}`}
        >
          {/* Progress Fill Bar */}
          <div
            ref={fillRef}
            className="absolute left-0 top-0 h-full w-0 rounded-full bg-gradient-to-r from-neon-cyan via-cyan-400 to-neon-violet shadow-[0_0_12px_rgba(0,245,255,0.4)] pointer-events-none"
          />

          {/* Scrubber Thumb Handle */}
          <div
            ref={thumbRef}
            aria-hidden="true"
            className={`absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-white border-2 border-neon-cyan shadow-[0_0_10px_rgba(0,245,255,0.8)] pointer-events-none transition-transform duration-100 ${
              isHovered || isDragging
                ? "opacity-100 scale-110"
                : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 scale-90"
            }`}
          />
        </div>
      </div>

      {/* Total Duration Time */}
      {showTimeLabels && (
        <span
          ref={durationTextRef}
          className="w-10 text-left font-mono text-[11px] text-slate-400 tabular-nums shrink-0"
          data-testid="progress-total-duration"
        >
          {formatDuration(duration)}
        </span>
      )}
    </div>
  );
});

ProgressBar.displayName = "ProgressBar";
