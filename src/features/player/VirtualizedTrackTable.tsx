import { useEffect } from "react";
import { useLibraryStore } from "../../store/useLibraryStore";
import { useAudioStore } from "../../store/useAudioStore";
import { VirtualList } from "../../core/virtual/VirtualList";
import { AudioTrack } from "../../core/audio/AudioPipeline";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function VirtualizedTrackTable() {
  const {
    tracks,
    filteredTracks,
    searchQuery,
    is10kBenchmarkActive,
    isBffChartsActive,
    bffChartMetadata,
    cachedTrackIds,
    storageUsage,
    isLoading,
    setSearchQuery,
    generate10kTracksBenchmark,
    loadStandardCatalog,
    loadBffCharts,
    toggleCacheTrack,
    initializeLibrary,
  } = useLibraryStore();

  const { currentTrack, status, setQueue } = useAudioStore();

  useEffect(() => {
    initializeLibrary();
  }, [initializeLibrary]);

  const handlePlayRow = (_track: AudioTrack, index: number) => {
    setQueue(filteredTracks, index);
  };

  return (
    <div className="space-y-6">
      {/* Header & Architectural Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-cyan-400 font-mono">
              DOM Recycling Engine
            </span>
            <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[11px] font-mono font-bold text-cyan-300 border border-cyan-500/20">
              {filteredTracks.length.toLocaleString()} Tracks Active
            </span>
            {isBffChartsActive && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-mono font-bold text-amber-300 border border-amber-500/30 animate-pulse">
                BFF SWR Cached
              </span>
            )}
          </div>
          <h2 className="mt-1 text-2xl font-bold text-white tracking-tight">
            Distributed Track Library
          </h2>
          <p className="mt-1 text-xs text-slate-400 max-w-xl">
            Powered by windowed virtual DOM recycling. Capable of smoothly scrolling 10,000+ items at 60 FPS with steady sub-20MB DOM memory footprint.
          </p>
        </div>

        {/* Catalog Switches & Benchmark Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {is10kBenchmarkActive || isBffChartsActive ? (
            <button
              onClick={loadStandardCatalog}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 transition-all"
            >
              Reset to Standard Catalog
            </button>
          ) : null}

          <button
            onClick={loadBffCharts}
            disabled={isLoading || isBffChartsActive}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              isBffChartsActive
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-default"
                : "bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 hover:opacity-95 shadow-lg shadow-amber-500/20 active:scale-95"
            }`}
          >
            <span>{isLoading ? "⚡ Fetching BFF..." : "🔥 Top Charts (BFF & SWR)"}</span>
          </button>

          {!is10kBenchmarkActive && (
            <button
              onClick={generate10kTracksBenchmark}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 py-2 text-xs font-semibold text-slate-950 hover:opacity-95 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
            >
              <span>⚡ 10k Benchmark</span>
            </button>
          )}

          {/* Offline Storage Status */}
          <div className="rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs font-mono text-slate-300">
            <span className="text-slate-400">Offline DB: </span>
            <span className="text-cyan-300 font-semibold">{cachedTrackIds.size}</span> cached
            <span className="text-slate-500 ml-1.5">({storageUsage.usageMB}MB used)</span>
          </div>
        </div>
      </div>

      {/* SWR Cache Status Callout */}
      {isBffChartsActive && bffChartMetadata && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-3 text-xs text-amber-200 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-semibold font-mono">BFF Cache Status:</span>
            <span>{bffChartMetadata.chartName} (Served via Backend-for-Frontend)</span>
          </div>
          <div className="font-mono text-[11px] text-amber-300/80">
            Synced: {new Date(bffChartMetadata.updatedAt).toLocaleTimeString()} • Protected with Redis SETNX Single-Flight Mutex
          </div>
        </div>
      )}

      {/* Search Input Bar */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search across ${tracks.length.toLocaleString()} tracks by title, artist, or genre...`}
          className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3.5 pl-11 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none transition-colors"
        />
        <svg
          className="absolute left-4 top-4 h-4 w-4 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Virtualized Table Container */}
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60 backdrop-blur-xl">
        {/* Table Column Headers */}
        <div className="grid grid-cols-[50px_2.5fr_2fr_1.5fr_80px_100px] items-center border-b border-white/10 bg-white/5 px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-400">
          <div>#</div>
          <div>Title</div>
          <div>Artist</div>
          <div className="hidden sm:block">Genre</div>
          <div className="text-right">Time</div>
          <div className="text-center">Offline</div>
        </div>

        {/* 60fps DOM Recycled Virtual List */}
        <VirtualList
          items={filteredTracks}
          itemHeight={64}
          containerHeight={520}
          overscan={5}
          getItemKey={(track) => track.id}
          renderItem={(track, index) => {
            const isPlayingThis = currentTrack?.id === track.id && status === "PLAYING";
            const isSelected = currentTrack?.id === track.id;
            const isCached = cachedTrackIds.has(track.id);

            return (
              <div
                className={`grid grid-cols-[50px_2.5fr_2fr_1.5fr_80px_100px] items-center px-6 transition-colors border-b border-white/5 group ${
                  isSelected ? "bg-cyan-500/10" : "hover:bg-white/5"
                }`}
                style={{ height: 64 }}
              >
                {/* Index / Play Button */}
                <div className="flex items-center text-xs font-mono text-slate-400">
                  <button
                    onClick={() => handlePlayRow(track, index)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-all text-slate-300"
                  >
                    {isPlayingThis ? (
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5 fill-current translate-x-0.5" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Title + Artwork */}
                <div className="flex items-center gap-3 truncate pr-4">
                  {track.coverUrl ? (
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      loading="lazy"
                      className="h-10 w-10 shrink-0 rounded-lg object-cover border border-white/10"
                    />
                  ) : (
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-slate-800" />
                  )}
                  <div className="truncate">
                    <div
                      className={`truncate text-sm font-medium ${
                        isSelected ? "text-cyan-300 font-semibold" : "text-white"
                      }`}
                    >
                      {track.title}
                    </div>
                    <div className="truncate text-xs text-slate-400">{track.album || "Single"}</div>
                  </div>
                </div>

                {/* Artist */}
                <div className="truncate text-xs text-slate-300 pr-4">{track.artist}</div>

                {/* Genre */}
                <div className="hidden sm:block truncate pr-4">
                  <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 border border-white/10">
                    {track.genre || "Electronic"}
                  </span>
                </div>

                {/* Duration */}
                <div className="text-right text-xs font-mono text-slate-400">
                  {formatDuration(track.duration)}
                </div>

                {/* Offline Cache Button */}
                <div className="flex justify-center">
                  <button
                    onClick={() => toggleCacheTrack(track)}
                    title={isCached ? "Remove from IndexedDB cache" : "Cache offline via IndexedDB"}
                    className={`rounded-lg p-1.5 transition-all ${
                      isCached
                        ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                        : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    {isCached ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}
