import { VirtualizedTrackTable } from "../features/player/VirtualizedTrackTable";
import { useSessionStore } from "../store/useSessionStore";
import { useAudioStore } from "../store/useAudioStore";
import { useLibraryStore } from "../store/useLibraryStore";
import { PageTransition } from "../components/transitions/PageTransition";
import { Button, Badge, AlbumCard, AlbumGridSkeleton } from "../components/ui";

export default function StreamingHubPage() {
  const { session, setModalOpen } = useSessionStore();
  const { currentTrack, status, togglePlayPause, setQueue } = useAudioStore();
  const { tracks, isLoading } = useLibraryStore();

  const featuredTracks = tracks.slice(0, 5);

  return (
    <PageTransition direction="up">
      <div className="space-y-10 pb-32">
        {/* Hero Banner with Glassmorphism and Neon Accents */}
        <div className="relative overflow-hidden rounded-[32px] border border-glass-border bg-gradient-to-br from-glass-surface/90 via-midnight-900/95 to-midnight-950 p-8 md:p-12 shadow-glass-lg backdrop-blur-2xl">
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-neon-cyan/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-neon-violet/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl">
            <Badge variant="cyan" withDot pulsing className="py-1 px-3.5 text-xs">
              Distributed Streaming Engine • Tier-1 Architecture
            </Badge>

            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white md:text-5xl font-sans">
              Real-Time Collaborative Soundstream
            </h1>

            <p className="mt-4 text-sm leading-relaxed text-slate-300 md:text-base">
              Engineered with a low-latency Web Audio API graph, an NTP-calibrated drift compensation algorithm (&lt;100ms sync error), IndexedDB offline caching, and DOM-recycling virtualization supporting 10,000+ continuous streams.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button
                variant="neon"
                size="lg"
                onClick={() => setModalOpen(true)}
              >
                <span>🎧 Open Listen Together Hub</span>
                {session && (
                  <span className="rounded-full bg-midnight-950/30 px-2 py-0.5 text-xs text-midnight-950 font-bold ml-1">
                    Active
                  </span>
                )}
              </Button>

              {currentTrack && (
                <Button
                  variant="glass"
                  size="lg"
                  onClick={togglePlayPause}
                >
                  <span>{status === "PLAYING" ? "Pause Current Stream" : "Resume Current Stream"}</span>
                </Button>
              )}
            </div>
          </div>

          {/* Architecture Specs Pill Grid */}
          <div className="relative z-10 mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-white/10 pt-8 font-mono text-xs">
            <div className="rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-md">
              <div className="text-slate-400 text-[11px]">CLOCK SYNC</div>
              <div className="mt-1 font-bold text-neon-cyan">NTP Multi-Sample</div>
              <div className="mt-0.5 text-[10px] text-slate-500">&lt;25ms error target</div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-md">
              <div className="text-slate-400 text-[11px]">AUDIO DSP</div>
              <div className="mt-1 font-bold text-neon-violet">Web Audio API</div>
              <div className="mt-0.5 text-[10px] text-slate-500">AnalyserNode 1024 FFT</div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-md">
              <div className="text-slate-400 text-[11px]">VIRTUALIZATION</div>
              <div className="mt-1 font-bold text-neon-emerald">DOM Recycling</div>
              <div className="mt-0.5 text-[10px] text-slate-500">10,000+ tracks @ 60 FPS</div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-md">
              <div className="text-slate-400 text-[11px]">CACHE ENGINE</div>
              <div className="mt-1 font-bold text-neon-amber">IndexedDB LRU</div>
              <div className="mt-0.5 text-[10px] text-slate-500">Binary blob chunking</div>
            </div>
          </div>
        </div>

        {/* Curated Soundstream Highlights - Album Cards with Hover Physics & Play Button Reveal */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-widest text-neon-cyan font-mono">
                  Curated Catalog
                </span>
                <Badge variant="glass" className="text-[10px]">
                  Fluid Micro-Interactions
                </Badge>
              </div>
              <h2 className="mt-1 text-2xl font-bold text-white tracking-tight font-sans">
                Featured Soundstreams
              </h2>
            </div>
            <span className="hidden sm:inline text-xs font-mono text-slate-400">
              Hover for spring physics & play reveal
            </span>
          </div>

          {isLoading ? (
            <AlbumGridSkeleton count={5} />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {featuredTracks.map((track, idx) => (
                <AlbumCard
                  key={track.id}
                  id={track.id}
                  title={track.title}
                  artist={track.artist}
                  coverUrl={track.coverUrl}
                  album={track.album}
                  genre={track.genre}
                  isPlaying={currentTrack?.id === track.id && status === "PLAYING"}
                  onPlay={() => setQueue(tracks, idx)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Virtualized Track Catalog */}
        <VirtualizedTrackTable />
      </div>
    </PageTransition>
  );
}
