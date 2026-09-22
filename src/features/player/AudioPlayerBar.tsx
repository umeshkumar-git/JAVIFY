import { useEffect, useRef } from "react";
import {
  useAudioStore,
  useCurrentTrack,
  usePlaybackStatus,
  useAudioVolume,
  usePlaybackModes,
} from "../../store/useAudioStore";
import { useSessionStore } from "../../store/useSessionStore";
import { AudioVisualizerRenderer } from "../../core/audio/AudioVisualizer";

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export function AudioPlayerBar() {
  const currentTrack = useCurrentTrack();
  const status = usePlaybackStatus();
  const { volume, isMuted, setVolume, toggleMute } = useAudioVolume();
  const { repeatMode, isShuffled, toggleShuffle, cycleRepeatMode } = usePlaybackModes();

  const currentTime = useAudioStore((s) => s.currentTime);
  const duration = useAudioStore((s) => s.duration);
  const togglePlayPause = useAudioStore((s) => s.togglePlayPause);
  const seek = useAudioStore((s) => s.seek);
  const nextTrack = useAudioStore((s) => s.nextTrack);
  const previousTrack = useAudioStore((s) => s.previousTrack);
  const pipeline = useAudioStore((s) => s.pipeline);

  const {
    session,
    isHost,
    latestDiagnosis,
    setModalOpen,
    broadcastAction,
  } = useSessionStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualizerRef = useRef<AudioVisualizerRenderer | null>(null);

  // Bind 60fps spectrum visualizer to AnalyserNode
  useEffect(() => {
    const analyser = pipeline.getAnalyserNode();
    if (canvasRef.current && analyser && status === "PLAYING") {
      visualizerRef.current = new AudioVisualizerRenderer(canvasRef.current, analyser);
      visualizerRef.current.start();
    } else {
      visualizerRef.current?.stop();
    }

    return () => {
      visualizerRef.current?.stop();
    };
  }, [pipeline, status]);

  const handlePlayPause = async () => {
    await togglePlayPause();
    if (session && isHost) {
      const nextStatus = status === "PLAYING" ? "PAUSE" : "PLAY";
      broadcastAction(nextStatus, currentTime * 1000);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    seek(val);
    if (session && isHost) {
      broadcastAction("SEEK", val * 1000);
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-cyan-500/20 bg-slate-950/85 backdrop-blur-xl px-4 py-3 md:px-8 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        {/* Track Metadata */}
        <div className="flex items-center gap-3.5 min-w-[200px] max-w-[280px]">
          {currentTrack?.coverUrl ? (
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              className="h-12 w-12 shrink-0 rounded-lg object-cover shadow-md border border-white/10"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
          )}

          <div className="truncate">
            <div className="truncate text-sm font-semibold text-white">
              {currentTrack?.title || "No track loaded"}
            </div>
            <div className="truncate text-xs text-slate-400">
              {currentTrack?.artist || "Select a stream from library"}
            </div>
          </div>
        </div>

        {/* Center Controls & Scrubber */}
        <div className="flex flex-1 flex-col items-center max-w-2xl px-2">
          <div className="flex items-center gap-4 mb-1.5">
            {/* Shuffle Button */}
            <button
              onClick={toggleShuffle}
              className={`p-1.5 rounded-lg transition-all ${
                isShuffled
                  ? "text-cyan-400 bg-cyan-500/15 shadow-sm shadow-cyan-500/25"
                  : "text-slate-400 hover:text-white"
              }`}
              title={isShuffled ? "Shuffle: Enabled" : "Shuffle: Disabled"}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>

            <button
              onClick={previousTrack}
              className="text-slate-400 hover:text-white transition-colors p-1"
              title="Previous Track"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>

            <button
              onClick={handlePlayPause}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-lg shadow-cyan-500/25 hover:scale-105 active:scale-95 transition-all"
              title={status === "PLAYING" ? "Pause" : "Play"}
            >
              {status === "PLAYING" ? (
                <svg className="w-5 h-5 fill-slate-950" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 fill-slate-950 translate-x-0.5" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              onClick={nextTrack}
              className="text-slate-400 hover:text-white transition-colors p-1"
              title="Next Track"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>

            {/* Repeat Button */}
            <button
              onClick={cycleRepeatMode}
              className={`relative p-1.5 rounded-lg transition-all ${
                repeatMode !== "OFF"
                  ? "text-cyan-400 bg-cyan-500/15 shadow-sm shadow-cyan-500/25"
                  : "text-slate-400 hover:text-white"
              }`}
              title={`Repeat: ${repeatMode}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {repeatMode === "ONE" && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-cyan-400 text-[8px] font-bold text-slate-950">
                  1
                </span>
              )}
            </button>
          </div>

          <div className="flex w-full items-center gap-3 text-xs font-mono text-slate-400">
            <span className="w-10 text-right">{formatTime(currentTime)}</span>
            <div className="relative flex-1 flex items-center">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:h-2 transition-all"
                style={{
                  background: `linear-gradient(to right, #06b6d4 ${progressPercent}%, #1e293b ${progressPercent}%)`,
                }}
              />
            </div>
            <span className="w-10">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right Section: Visualizer & Listen Together Badge & Volume */}
        <div className="flex items-center gap-4">
          {/* 60fps Spectrum Canvas */}
          <div className="hidden lg:block relative w-24 h-9 rounded bg-black/40 overflow-hidden border border-white/10">
            <canvas ref={canvasRef} width={96} height={36} className="w-full h-full" />
          </div>

          {/* Collaborative Listen Together Badge */}
          <button
            onClick={() => setModalOpen(true)}
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
              session
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-500/20"
                : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  session ? "bg-emerald-400" : "bg-cyan-400"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  session ? "bg-emerald-500" : "bg-cyan-500"
                }`}
              />
            </span>
            <span className="hidden sm:inline">
              {session ? `Sync: ${session.sessionId}` : "Listen Together"}
            </span>
            {latestDiagnosis && (
              <span className="font-mono text-[10px] text-emerald-300 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded">
                {Math.abs(latestDiagnosis.driftMs)}ms
              </span>
            )}
          </button>

          {/* Volume Control */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="text-slate-400 hover:text-white transition-colors"
            >
              {isMuted || volume === 0 ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
