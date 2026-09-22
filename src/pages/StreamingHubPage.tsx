import { VirtualizedTrackTable } from "../features/player/VirtualizedTrackTable";
import { useSessionStore } from "../store/useSessionStore";
import { useAudioStore } from "../store/useAudioStore";

export default function StreamingHubPage() {
  const { session, setModalOpen } = useSessionStore();
  const { currentTrack, status, togglePlayPause } = useAudioStore();

  return (
    <div className="space-y-8 pb-32">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-[32px] border border-cyan-500/20 bg-gradient-to-br from-slate-900/90 via-[#0a0f1d] to-[#050811] p-8 md:p-12 shadow-2xl shadow-cyan-950/30">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-mono font-medium text-cyan-300">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            Distributed Streaming Engine • Tier-1 Architecture
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white md:text-5xl">
            Real-Time Collaborative Soundstream
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-slate-300 md:text-base">
            Engineered with a low-latency Web Audio API graph, an NTP-calibrated drift compensation algorithm (&lt;100ms sync error), IndexedDB offline caching, and DOM-recycling virtualization supporting 10,000+ continuous streams.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-xl shadow-cyan-500/25 hover:opacity-95 active:scale-95 transition-all"
            >
              <span>🎧 Open Listen Together Hub</span>
              {session && (
                <span className="rounded-full bg-slate-950/20 px-2 py-0.5 text-xs text-slate-950 font-bold">
                  Active
                </span>
              )}
            </button>

            {currentTrack && (
              <button
                onClick={togglePlayPause}
                className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-semibold text-white hover:bg-white/10 transition-all"
              >
                <span>{status === "PLAYING" ? "Pause Current Stream" : "Resume Current Stream"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Architecture Specs Pill Grid */}
        <div className="relative z-10 mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-white/10 pt-8 font-mono text-xs">
          <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
            <div className="text-slate-400 text-[11px]">CLOCK SYNC</div>
            <div className="mt-1 font-bold text-cyan-300">NTP Multi-Sample</div>
            <div className="mt-0.5 text-[10px] text-slate-500">&lt;25ms error target</div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
            <div className="text-slate-400 text-[11px]">AUDIO DSP</div>
            <div className="mt-1 font-bold text-purple-300">Web Audio API</div>
            <div className="mt-0.5 text-[10px] text-slate-500">AnalyserNode 1024 FFT</div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
            <div className="text-slate-400 text-[11px]">VIRTUALIZATION</div>
            <div className="mt-1 font-bold text-emerald-300">DOM Recycling</div>
            <div className="mt-0.5 text-[10px] text-slate-500">10,000+ tracks @ 60 FPS</div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
            <div className="text-slate-400 text-[11px]">CACHE ENGINE</div>
            <div className="mt-1 font-bold text-amber-300">IndexedDB LRU</div>
            <div className="mt-0.5 text-[10px] text-slate-500">Binary blob chunking</div>
          </div>
        </div>
      </div>

      {/* Virtualized Track Catalog */}
      <VirtualizedTrackTable />
    </div>
  );
}
