import React from "react";
import { cn } from "../../utils/cn";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Generic Base Skeleton element with modern cybernetic pulse shimmer.
 */
export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-xl bg-white/[0.04] before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/[0.06] before:to-transparent",
        "animate-pulse",
        className
      )}
      {...props}
    />
  );
};

/**
 * 5-Column Tracklist Enterprise Skeleton Loader.
 * Matches standard music streaming tracklist layout:
 * Column 1: Index / Play Button (#)
 * Column 2: Artwork + Track Title & Album
 * Column 3: Artist Name
 * Column 4: Genre Badge
 * Column 5: Duration Timestamp
 */
export interface TracklistSkeletonProps {
  rows?: number;
  className?: string;
  showHeader?: boolean;
}

export const TracklistSkeleton: React.FC<TracklistSkeletonProps> = ({
  rows = 5,
  className,
  showHeader = true,
}) => {
  return (
    <div
      data-testid="tracklist-skeleton"
      className={cn(
        "w-full overflow-hidden rounded-3xl border border-glass-border bg-glass-surface/60 backdrop-blur-xl",
        className
      )}
    >
      {/* 5-Column Header Placeholder */}
      {showHeader && (
        <div className="grid grid-cols-[50px_2.5fr_2fr_1.5fr_80px] items-center border-b border-white/5 bg-white/[0.02] px-6 py-3.5 gap-4">
          <Skeleton className="h-3 w-4" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-14 hidden sm:block" />
          <Skeleton className="h-3 w-10 justify-self-end" />
        </div>
      )}

      {/* Repeating Track Rows */}
      <div className="divide-y divide-white/[0.03]">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={`track-skeleton-${index}`}
            className="grid grid-cols-[50px_2.5fr_2fr_1.5fr_80px] items-center px-6 py-3 gap-4"
            style={{ height: 64 }}
          >
            {/* Col 1: Index / Play Icon Placeholder */}
            <div className="flex items-center">
              <Skeleton className="h-7 w-7 rounded-lg" />
            </div>

            {/* Col 2: Artwork (40x40) + Title & Album */}
            <div className="flex items-center gap-3 truncate">
              <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
              <div className="flex flex-col gap-1.5 w-full max-w-[200px]">
                <Skeleton
                  className="h-3.5 rounded"
                  style={{ width: `${65 + ((index * 13) % 30)}%` }}
                />
                <Skeleton
                  className="h-2.5 rounded"
                  style={{ width: `${40 + ((index * 17) % 25)}%` }}
                />
              </div>
            </div>

            {/* Col 3: Artist */}
            <div className="flex items-center">
              <Skeleton
                className="h-3 rounded"
                style={{ width: `${50 + ((index * 19) % 35)}%` }}
              />
            </div>

            {/* Col 4: Genre Badge */}
            <div className="hidden sm:flex items-center">
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>

            {/* Col 5: Duration Timestamp */}
            <div className="flex justify-end">
              <Skeleton className="h-3 w-8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Grid of Album Covers Skeleton Loader.
 * Matches responsive card grid (2 cols mobile, 3 tablet, 4-5 desktop).
 */
export interface AlbumGridSkeletonProps {
  count?: number;
  className?: string;
}

export const AlbumGridSkeleton: React.FC<AlbumGridSkeletonProps> = ({
  count = 8,
  className,
}) => {
  return (
    <div
      data-testid="album-grid-skeleton"
      className={cn(
        "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
        className
      )}
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`album-skeleton-${index}`}
          className="flex flex-col rounded-3xl border border-glass-border bg-glass-surface/50 p-4 backdrop-blur-xl"
        >
          {/* Cover Art Square */}
          <div className="relative aspect-square w-full">
            <Skeleton className="h-full w-full rounded-2xl" />
          </div>

          {/* Title & Artist Lines */}
          <div className="mt-3.5 flex flex-col gap-2">
            <Skeleton
              className="h-3.5 rounded"
              style={{ width: `${70 + ((index * 11) % 25)}%` }}
            />
            <Skeleton
              className="h-2.5 rounded"
              style={{ width: `${45 + ((index * 13) % 20)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
