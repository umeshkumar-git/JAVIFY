import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AdaptiveImage } from "../../core/media/AdaptiveImage";
import { Badge } from "./Badge";
import { cn } from "../../utils/cn";

export interface AlbumCardProps {
  id: string;
  title: string;
  artist: string;
  coverUrl?: string;
  album?: string;
  genre?: string;
  isPlaying?: boolean;
  onPlay?: () => void;
  className?: string;
}

export const AlbumCard: React.FC<AlbumCardProps> = ({
  title,
  artist,
  coverUrl = "",
  album,
  genre,
  isPlaying = false,
  onPlay,
  className,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      data-testid="album-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      className={cn(
        "group relative flex flex-col rounded-3xl border border-glass-border bg-glass-surface/70 p-4 backdrop-blur-xl transition-all duration-300",
        "hover:border-neon-cyan/40 hover:bg-glass-elevated/90 hover:shadow-glass-lg hover:shadow-neon-cyan/15 cursor-pointer",
        className
      )}
      onClick={onPlay}
    >
      {/* Artwork Container */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-midnight-900 border border-white/5">
        <AdaptiveImage
          src={coverUrl}
          alt={title}
          fallbackIconText={artist}
          width={280}
          quality={85}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Ambient Gradient Overlay on Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-midnight-950/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Optional Genre Tag Pill */}
        {genre && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <Badge variant="glass" className="text-[10px] py-0 px-2 bg-midnight-950/60 backdrop-blur-md border-white/10">
              {genre}
            </Badge>
          </div>
        )}

        {/* Smooth Play Button Reveal with Spring Physics */}
        <AnimatePresence>
          {(isHovered || isPlaying) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.75, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 8 }}
              transition={{ type: "spring", stiffness: 450, damping: 25 }}
              className="absolute bottom-3 right-3 z-20"
            >
              <button
                type="button"
                aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay?.();
                }}
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full shadow-neon-cyan transition-transform active:scale-90 cursor-pointer",
                  isPlaying
                    ? "bg-neon-cyan text-midnight-950 shadow-[0_0_25px_rgba(0,245,255,0.6)]"
                    : "bg-gradient-to-r from-neon-cyan to-neon-violet text-midnight-950 hover:scale-105"
                )}
              >
                {isPlaying ? (
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 fill-current translate-x-0.5" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Track & Artist Info */}
      <div className="mt-3.5 flex flex-col">
        <h4 className="truncate font-sans text-sm font-semibold text-white tracking-tight group-hover:text-neon-cyan transition-colors">
          {title}
        </h4>
        <p className="truncate text-xs text-slate-400 mt-0.5">
          {artist}
          {album ? ` • ${album}` : ""}
        </p>
      </div>
    </motion.div>
  );
};
