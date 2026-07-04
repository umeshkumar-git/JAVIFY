import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useJavifyStore } from "../../store/useJavifyStore";
import { cn } from "../../utils/cn";
import { challenges } from "../../data/javify";

interface Battle {
  id: string;
  roomCode: string;
  challengeId: string;
  challengeTitle: string;
  status: "WAITING" | "IN_PROGRESS" | "COMPLETED";
  player1: string;
  player2?: string;
  winner?: string;
  createdAt: number;
}

const STORAGE_KEY = "javify-multiplayer-battles";

function loadBattles(): Battle[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBattles(battles: Battle[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(battles));
}

function generateRoomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function GlassPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("glass-panel rounded-[28px] border border-white/10", className)}>{children}</div>;
}

export default function MultiplayerBattles() {
  const navigate = useNavigate();
  const username = useJavifyStore((s) => s.username);
  const [battles, setBattles] = useState<Battle[]>(() => loadBattles());
  const [selectedChallengeId, setSelectedChallengeId] = useState(challenges[0]?.id ?? "");
  const [joinCode, setJoinCode] = useState("");
  const [activeTab, setActiveTab] = useState<"lobby" | "history">("lobby");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => saveBattles(battles), [battles]);

  const openLobbies = useMemo(() => battles.filter((b) => b.status === "WAITING"), [battles]);
  const myHistory = useMemo(
    () => battles.filter((b) => b.player1 === username || b.player2 === username),
    [battles, username]
  );

  const createBattle = () => {
    const challenge = challenges.find((c) => c.id === selectedChallengeId);
    if (!challenge) return;
    const battle: Battle = {
      id: crypto.randomUUID(),
      roomCode: generateRoomCode(),
      challengeId: challenge.id,
      challengeTitle: challenge.title,
      status: "WAITING",
      player1: username,
      createdAt: Date.now(),
    };
    setBattles((b) => [battle, ...b]);
    setNotice(`Room ${battle.roomCode} created! Share the code with your opponent.`);
    setTimeout(() => setNotice(null), 4000);
  };

  const joinBattle = (code: string) => {
    const normalized = code.trim().toUpperCase();
    const target = battles.find((b) => b.roomCode === normalized && b.status === "WAITING");
    if (!target) {
      setNotice(`No open room found with code ${normalized}.`);
      setTimeout(() => setNotice(null), 4000);
      return;
    }
    if (target.player1 === username) {
      setNotice("You can't join your own room — open it from your dashboard.");
      setTimeout(() => setNotice(null), 4000);
      return;
    }
    setBattles((all) =>
      all.map((b) =>
        b.id === target.id ? { ...b, player2: username, status: "IN_PROGRESS" } : b
      )
    );
    setJoinCode("");
    navigate(`/challenge/${target.challengeId}`);
  };

  const quickMatch = () => {
    if (openLobbies.length > 0) {
      joinBattle(openLobbies[0].roomCode);
    } else {
      createBattle();
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-600 to-orange-500 text-lg shadow-lg">
              ⚔️
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.34em] text-fuchsia-600 dark:text-fuchsia-300">Multiplayer Arena</p>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">Battle Royale</h1>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
            Race opponents to solve the same Java challenge. Winner takes +50 XP, +100 coins.
          </p>
        </div>
        <button
          type="button"
          onClick={quickMatch}
          className="btn-3d btn-3d-pink inline-flex items-center gap-2 text-sm"
        >
          ⚡ Quick Match
        </button>
      </div>

      {/* Notice */}
      {notice && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200"
        >
          {notice}
        </motion.div>
      )}

      {/* Tab Switcher */}
      <div className="flex rounded-2xl border border-white/10 bg-white/5 p-1 text-sm">
        {(["lobby", "history"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setActiveTab(t)}
            className={cn(
              "flex-1 rounded-xl px-3 py-2 capitalize transition",
              activeTab === t ? "bg-white/12 text-white" : "text-slate-400 hover:text-white"
            )}
          >
            {t === "lobby" ? "Open Lobbies" : "My Battles"}
          </button>
        ))}
      </div>

      {activeTab === "lobby" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          {/* Create */}
          <GlassPanel className="p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Create New Room</h3>
            <p className="text-xs text-gray-500 dark:text-slate-500 mb-5">Pick a challenge and invite a friend.</p>
            <label className="block mb-4">
              <span className="text-xs uppercase tracking-widest text-gray-500 dark:text-slate-400">Challenge</span>
              <select
                value={selectedChallengeId}
                onChange={(e) => setSelectedChallengeId(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-cyan-500/40 dark:focus:border-cyan-400/40"
              >
                {challenges.map((c) => (
                  <option key={c.id} value={c.id} className="bg-white dark:bg-[#0b1020] text-gray-900 dark:text-white">
                    {c.title} ({c.difficulty})
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={createBattle} className="btn-3d w-full text-sm text-white">
              Create Room
            </button>
          </GlassPanel>

          {/* Join */}
          <GlassPanel className="p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Join Room</h3>
            <p className="text-xs text-gray-500 dark:text-slate-500 mb-5">Enter a 6-character room code.</p>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ROOM CODE"
              maxLength={6}
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-center text-lg font-mono tracking-[0.4em] text-gray-900 dark:text-white outline-none focus:border-fuchsia-500/40 dark:focus:border-fuchsia-400/40 mb-4"
            />
            <button
              type="button"
              onClick={() => joinBattle(joinCode)}
              disabled={joinCode.length < 4}
              className="btn-3d btn-3d-cyan w-full text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Join Battle
            </button>

            {openLobbies.length > 0 && (
              <div className="mt-6 space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-slate-500">
                  Open Lobbies ({openLobbies.length})
                </p>
                {openLobbies.slice(0, 4).map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2"
                  >
                    <div>
                      <div className="text-sm font-mono text-cyan-300">{b.roomCode}</div>
                      <div className="text-[10px] text-slate-500">
                        {b.challengeTitle} · hosted by {b.player1}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => joinBattle(b.roomCode)}
                      className="rounded-lg bg-fuchsia-500/20 px-3 py-1 text-xs text-fuchsia-300 hover:bg-fuchsia-500/30 transition"
                    >
                      Join
                    </button>
                  </div>
                ))}
              </div>
            )}
          </GlassPanel>
        </div>
      )}

      {activeTab === "history" && (
        <GlassPanel className="p-5">
          {myHistory.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              No battles yet. Create a room or quick-match!
            </div>
          ) : (
            <div className="space-y-2">
              {myHistory.map((b) => {
                const won = b.winner === username;
                return (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold shadow-sm",
                          b.status === "COMPLETED"
                            ? won
                              ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300"
                              : "bg-rose-500/20 text-rose-600 dark:text-rose-300"
                            : b.status === "IN_PROGRESS"
                              ? "bg-amber-500/20 text-amber-600 dark:text-amber-300"
                              : "bg-gray-100 dark:bg-slate-500/20 text-gray-500 dark:text-slate-300"
                        )}
                      >
                        {b.status === "COMPLETED" ? (won ? "🏆" : "💀") : "⏳"}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{b.challengeTitle}</div>
                        <div className="text-[10px] text-gray-500 dark:text-slate-500">
                          {b.roomCode} · {b.status.toLowerCase().replace("_", " ")}
                        </div>
                      </div>
                    </div>
                    {b.status === "IN_PROGRESS" && (
                      <Link
                        to={`/challenge/${b.challengeId}`}
                        className="rounded-lg bg-cyan-500/20 px-3 py-1.5 text-xs text-cyan-300 hover:bg-cyan-500/30 transition"
                      >
                        Resume
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </GlassPanel>
      )}
    </div>
  );
}
