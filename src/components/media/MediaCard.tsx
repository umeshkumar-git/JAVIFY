import React from "react";
import { cn } from "../../utils/cn";

export interface MediaCardProps {
  id: string;
  title: string;
  subtitle: string;
  coverUrl: string;
  badgeText?: string;
  duration?: string;
  isPlaying?: boolean;
  onPlay?: (id: string) => void;
  className?: string;
}

/**
 * MediaCard Component
 *
 * Implements hover physics (subtle lift, shadow bloom, scale) and a floating play button reveal.
 * Engineered with high layout stability and zero Cumulative Layout Shift (CLS) via strict aspect ratio.
 */
export const MediaCard: React.FC<MediaCardProps> = ({
  id,
  title,
  subtitle,
  coverUrl,
  badgeText,
  duration,
  isPlaying = false,
  onPlay,
  className,
}) => {
  return (
    <article
      data-testid="media-card"
      tabIndex={0}
      aria-label={`${title} by ${subtitle}`}
      onClick={() => onPlay?.(id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPlay?.(id);
        }
      }}
      className={cn(
        "group relative flex flex-col rounded-3xl border border-glass-border bg-glass-surface/75 p-3.5 backdrop-blur-xl",
        "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer select-none",
        "hover:-translate-y-1.5 hover:border-neon-cyan/40 hover:bg-glass-elevated/90 hover:shadow-glass-lg hover:shadow-neon-cyan/20",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/80",
        className
      )}
    >
      {/* Aspect-Ratio Fixed Artwork Container (1:1 Aspect Ratio to eliminate CLS) */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-midnight-900 border border-white/5">
        <img
          src={coverUrl}
          alt={title}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />

        {/* Dynamic Dark Gradient Scrim on Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-midnight-950/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />

        {/* Optional Category / Genre Pill Badge */}
        {badgeText && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <span className="inline-flex items-center rounded-full border border-white/10 bg-midnight-950/70 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-200 backdrop-blur-md">
              {badgeText}
            </span>
          </div>
        )}

        {/* Floating Play Button Reveal (Hover Physics with Spring Transformation) */}
        <div
          className={cn(
            "absolute bottom-3 right-3 z-20 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            isPlaying
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 translate-y-2 scale-90 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100"
          )}
        >
          <button
            type="button"
            aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
            onClick={(e) => {
              e.stopPropagation();
              onPlay?.(id);
            }}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full shadow-neon-cyan transition-transform active:scale-90 cursor-pointer",
              isPlaying
                ? "bg-neon-cyan text-midnight-950 shadow-[0_0_20px_rgba(0,245,255,0.6)]"
                : "bg-gradient-to-r from-neon-cyan to-neon-violet text-midnight-950 hover:scale-105"
            )}
          >
            {isPlaying ? (
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4 fill-current translate-x-0.5" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Clean Typographic Hierarchy */}
      <div className="mt-3 flex flex-col">
        <h3 className="truncate font-sans text-sm font-semibold tracking-tight text-white group-hover:text-neon-cyan transition-colors">
          {title}
        </h3>
        <div className="flex items-center justify-between text-xs text-slate-400 mt-0.5">
          <span className="truncate">{subtitle}</span>
          {duration && <span className="font-mono text-[11px] text-slate-500 shrink-0 ml-2">{duration}</span>}
        </div>
      </div>
    </article>
  );
};
