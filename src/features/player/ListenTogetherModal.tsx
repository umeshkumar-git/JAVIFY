import { useState } from "react";
import { useSessionStore } from "../../store/useSessionStore";

export function ListenTogetherModal() {
  const {
    session,
    isHost,
    isModalOpen,
    setModalOpen,
    createSession,
    joinSession,
    leaveSession,
    driftMetrics,
    latestDiagnosis,
    errorMessage,
    clearError,
  } = useSessionStore();

  const [inputRoomId, setInputRoomId] = useState("");
  const [username, setUsername] = useState("Explorer");
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isModalOpen) return null;

  const handleCreate = async () => {
    setIsSubmitting(true);
    await createSession(username);
    setIsSubmitting(false);
  };

  const handleJoin = async () => {
    if (!inputRoomId.trim()) return;
    setIsSubmitting(true);
    await joinSession(inputRoomId.trim(), username);
    setIsSubmitting(false);
  };

  const handleCopy = () => {
    if (!session) return;
    navigator.clipboard.writeText(session.sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-cyan-500/30 bg-slate-950 p-6 md:p-8 shadow-2xl shadow-cyan-900/20 text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 shadow-md shadow-cyan-500/20 text-slate-950 font-black">
              🎧
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Listen Together
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  NTP &lt;100ms Sync
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Synchronized real-time audio playback engine with dynamic drift compensation
              </p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen(false)}
            className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-2.5 text-xs text-rose-300">
            <span>{errorMessage}</span>
            <button onClick={clearError} className="text-rose-400 hover:text-rose-200 font-bold">×</button>
          </div>
        )}

        {/* Content */}
        {!session ? (
          <div className="mt-6 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Your Display Name</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter handle..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Create Session Card */}
              <div className="flex flex-col justify-between rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-cyan-950/30 to-transparent p-5">
                <div>
                  <div className="text-sm font-semibold text-cyan-300">Host New Session</div>
                  <p className="mt-1.5 text-xs leading-5 text-slate-400">
                    Broadcast your current playback queue. Connected peers will hear the stream in tight lockstep.
                  </p>
                </div>
                <button
                  onClick={handleCreate}
                  disabled={isSubmitting}
                  className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 text-center text-xs font-semibold text-slate-950 hover:opacity-90 active:scale-95 transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? "Starting..." : "Start Host Session"}
                </button>
              </div>

              {/* Join Session Card */}
              <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-5">
                <div>
                  <div className="text-sm font-semibold text-white">Join Existing Room</div>
                  <p className="mt-1.5 text-xs leading-5 text-slate-400">
                    Paste a room ID from a friend to sync audio.
                  </p>
                  <input
                    type="text"
                    value={inputRoomId}
                    onChange={(e) => setInputRoomId(e.target.value)}
                    placeholder="e.g. room_4a8b12"
                    className="mt-3 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs font-mono text-cyan-200 placeholder-slate-600 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleJoin}
                  disabled={isSubmitting || !inputRoomId.trim()}
                  className="mt-4 w-full rounded-xl border border-white/20 bg-white/10 py-2.5 text-center text-xs font-semibold text-white hover:bg-white/15 active:scale-95 transition-all disabled:opacity-40"
                >
                  {isSubmitting ? "Connecting..." : "Join & Sync"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Active Session View */
          <div className="mt-6 space-y-6">
            {/* Session Status & Share Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4">
              <div>
                <div className="text-xs text-slate-400">Active Room ID</div>
                <div className="font-mono text-lg font-bold text-cyan-300">{session.sessionId}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/20 transition-all"
                >
                  {copied ? "Copied! ✓" : "Copy Room ID"}
                </button>
                <button
                  onClick={leaveSession}
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 transition-all"
                >
                  Leave
                </button>
              </div>
            </div>

            {/* Systems Architecture Live Telemetry */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-3">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Distributed Telemetry
                </span>
                <span className="font-mono text-slate-400 text-[11px]">
                  Role: {isHost ? "Host (Authoritative Master)" : "Peer (Calibrated Listener)"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
                <div className="rounded-xl border border-white/5 bg-white/5 p-2.5">
                  <div className="text-[10px] text-slate-400 uppercase">RTT (Latency)</div>
                  <div className="mt-1 text-sm font-bold text-cyan-300">
                    {driftMetrics ? `${driftMetrics.rttMs}ms` : "~12ms"}
                  </div>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/5 p-2.5">
                  <div className="text-[10px] text-slate-400 uppercase">Clock Offset (θ)</div>
                  <div className="mt-1 text-sm font-bold text-purple-300">
                    {driftMetrics ? `${driftMetrics.clockOffsetMs}ms` : "0ms"}
                  </div>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/5 p-2.5">
                  <div className="text-[10px] text-slate-400 uppercase">Estimated Drift</div>
                  <div className={`mt-1 text-sm font-bold ${
                    latestDiagnosis && Math.abs(latestDiagnosis.driftMs) < 25
                      ? "text-emerald-400"
                      : "text-amber-400"
                  }`}>
                    {latestDiagnosis ? `${Math.abs(latestDiagnosis.driftMs)}ms` : "<15ms"}
                  </div>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/5 p-2.5">
                  <div className="text-[10px] text-slate-400 uppercase">Sync Engine Mode</div>
                  <div className="mt-1 text-[11px] font-bold text-slate-200 truncate">
                    {latestDiagnosis?.mode || "IN_SYNC"}
                  </div>
                </div>
              </div>
            </div>

            {/* Participants list */}
            <div>
              <div className="text-xs font-semibold text-slate-300 mb-2">
                Connected Peers ({session.participants.length})
              </div>
              <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                {session.participants.map((p) => (
                  <div key={p.socketId} className="flex items-center justify-between px-4 py-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span className="font-medium text-slate-200">{p.username}</span>
                    </div>
                    {p.isHost && (
                      <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 border border-cyan-500/30">
                        Host
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
