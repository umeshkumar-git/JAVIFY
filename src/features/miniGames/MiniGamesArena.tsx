import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../utils/cn";
import { useJavifyStore } from "../../store/useJavifyStore";
import { recordActivity } from "../../services/analytics";
import {
  ARENA_ACHIEVEMENTS, DEFAULT_ARENA_STATS, getDailyChallenge, STORY_WORLDS,
  type ArenaStats, type GameReward,
} from "./miniGames.data";
import MemoryMatch from "./games/MemoryMatch";
import BugHunt from "./games/BugHunt";
import AlgorithmArrange from "./games/AlgorithmArrange";
import LogicPuzzle from "./games/LogicPuzzle";
import StoryMode from "./games/StoryMode";

type Section = "home" | "quick" | "story" | "daily" | "leaderboard";
type ActiveGame = "memory" | "bug" | "algorithm" | "logic" | "story" | null;

const ARENA_STATE_KEY = "javify-arena-state";
interface ArenaPersistedState {
  stats: ArenaStats;
  completedMissions: string[];
  completedDailies: string[];
  earnedAchievements: string[];
}

function loadArenaState(): ArenaPersistedState {
  try {
    const raw = localStorage.getItem(ARENA_STATE_KEY);
    if (!raw) return { stats: { ...DEFAULT_ARENA_STATS }, completedMissions: [], completedDailies: [], earnedAchievements: [] };
    return JSON.parse(raw);
  } catch { return { stats: { ...DEFAULT_ARENA_STATS }, completedMissions: [], completedDailies: [], earnedAchievements: [] }; }
}
function saveArenaState(s: ArenaPersistedState) { localStorage.setItem(ARENA_STATE_KEY, JSON.stringify(s)); }

function GlassPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("glass-panel rounded-[28px] border border-white/10", className)}>{children}</div>;
}

function XpToast({ xp, coins, onDone }: { xp: number; coins: number; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
  return (
    <motion.div initial={{ opacity: 0, y: -30, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20 }}
      className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-4 rounded-2xl border border-white/10 bg-[#0b1020]/90 backdrop-blur-xl px-6 py-3 shadow-2xl"
    >
      <span className="text-2xl">🎉</span>
      <span className="text-cyan-300 font-bold">+{xp} XP</span>
      <span className="text-amber-300 font-bold">+{coins} coins</span>
    </motion.div>
  );
}

const QUICK_GAMES = [
  { id: "memory", label: "Memory Match", icon: "🧠", desc: "Match Java concepts to definitions", xp: 10, coins: 5, difficulty: "Easy", time: "~60s" },
  { id: "bug", label: "Find the Bug", icon: "🐞", desc: "Spot errors in Java code snippets", xp: 30, coins: 15, difficulty: "Medium", time: "~2 min" },
  { id: "algorithm", label: "Algorithm Arrange", icon: "🔢", desc: "Put algorithm steps in order", xp: 10, coins: 6, difficulty: "Easy", time: "~60s" },
  { id: "logic", label: "Logic Puzzle", icon: "🧩", desc: "Solve Java logic and output questions", xp: 40, coins: 20, difficulty: "Medium", time: "~3 min" },
];

const SIDEBAR_SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: "home", label: "Arena Home", icon: "🏠" },
  { id: "quick", label: "Quick Games", icon: "⚡" },
  { id: "story", label: "Story Mode", icon: "📖" },
  { id: "daily", label: "Daily Challenge", icon: "📅" },
  { id: "leaderboard", label: "Leaderboards", icon: "🏆" },
];

export default function MiniGamesArena() {
  const username = useJavifyStore(s => s.username);
  const xp = useJavifyStore(s => s.xp);

  const [arenaState, setArenaState] = useState<ArenaPersistedState>(loadArenaState);
  const [section, setSection] = useState<Section>("home");
  const [activeGame, setActiveGame] = useState<ActiveGame>(null);
  const [toast, setToast] = useState<{ xp: number; coins: number } | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const daily = useMemo(() => getDailyChallenge(), []);
  const isDailyDone = arenaState.completedDailies.includes(daily.id);

  const newAchievements = useMemo(
    () => ARENA_ACHIEVEMENTS.filter(a => !arenaState.earnedAchievements.includes(a.id) && a.check(arenaState.stats)),
    [arenaState]
  );

  useEffect(() => { saveArenaState(arenaState); }, [arenaState]);

  const grantReward = (reward: GameReward, statUpdate: Partial<ArenaStats>) => {
    setToast({ xp: reward.xp, coins: reward.coins });
    // Use store's resetProgress to add XP/coins indirectly by just directly pushing into localStorage
    useJavifyStore.setState(s => ({
      xp: s.xp + reward.xp,
      coins: s.coins + reward.coins,
    }));

    setArenaState(prev => {
      const newStats: ArenaStats = { ...prev.stats, ...statUpdate, totalXpEarned: prev.stats.totalXpEarned + reward.xp, gamesPlayed: prev.stats.gamesPlayed + 1 };
      const newAch = ARENA_ACHIEVEMENTS.filter(a => !prev.earnedAchievements.includes(a.id) && a.check(newStats)).map(a => a.id);
      return { ...prev, stats: newStats, earnedAchievements: [...prev.earnedAchievements, ...newAch] };
    });

    recordActivity(username, "mini_game_complete", `Earned +${reward.xp} XP, +${reward.coins} coins`);
  };

  const handleQuickGameComplete = (gameId: ActiveGame, reward: GameReward, stats: Record<string, number>) => {
    const statUpdates: Partial<ArenaStats> = {};
    if (gameId === "memory") statUpdates.memoryGamesCompleted = (arenaState.stats.memoryGamesCompleted || 0) + 1;
    if (gameId === "bug") statUpdates.bugsFixed = (arenaState.stats.bugsFixed || 0) + (stats.bugsFixed || 0);
    if (gameId === "algorithm") statUpdates.algorithmsCompleted = (arenaState.stats.algorithmsCompleted || 0) + 1;
    if (gameId === "logic") statUpdates.logicPuzzlesCompleted = (arenaState.stats.logicPuzzlesCompleted || 0) + (stats.correct || 0);
    grantReward(reward, statUpdates);
    setActiveGame(null);
  };

  const handleMissionComplete = (missionId: string, reward: GameReward) => {
    setArenaState(prev => {
      if (prev.completedMissions.includes(missionId)) return prev;
      const worldId = missionId.split("m")[0];
      const world = STORY_WORLDS.find(w => w.id === worldId);
      const allMissions = world?.missions.map(m => m.id) ?? [];
      const nowDone = [...prev.completedMissions, missionId];
      const worldDone = world && allMissions.every(id => nowDone.includes(id));
      const newStats = {
        ...prev.stats,
        worldsCompleted: worldDone && !prev.stats.worldsCompleted.includes(worldId) ? [...prev.stats.worldsCompleted, worldId] : prev.stats.worldsCompleted,
      };
      return { ...prev, completedMissions: nowDone, stats: newStats };
    });
    grantReward(reward, {});
  };

  const handleDailyComplete = (reward: GameReward) => {
    if (isDailyDone) return;
    setArenaState(prev => ({
      ...prev,
      completedDailies: [...prev.completedDailies, daily.id],
      stats: { ...prev.stats, dailyChallengesCompleted: prev.stats.dailyChallengesCompleted + 1 },
    }));
    grantReward({ ...reward, xp: daily.reward.xp, coins: daily.reward.coins }, {});
    setActiveGame(null);
  };

  const setActiveSectionWithClose = (s: Section) => { setSection(s); setActiveGame(null); setMobileSidebarOpen(false); };

  // ── Sidebar ──────────────────────────────────────────────────────────────────
  const Sidebar = () => (
    <GlassPanel className="flex flex-col gap-1 p-4 w-52 shrink-0">
      <div className="px-2 mb-3">
        <div className="text-xs uppercase tracking-widest text-fuchsia-300">🎮 Mini Games Arena</div>
        <div className="text-[11px] text-slate-500 mt-0.5">{arenaState.stats.gamesPlayed} games played</div>
      </div>
      {SIDEBAR_SECTIONS.map(s => (
        <button key={s.id} type="button" onClick={() => setActiveSectionWithClose(s.id)}
          className={cn("flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-all",
            section === s.id ? "bg-white/12 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white")}
        >
          <span>{s.icon}</span><span>{s.label}</span>
        </button>
      ))}
      <div className="mt-auto pt-4 border-t border-white/5">
        <div className="text-[10px] uppercase tracking-widest text-slate-600 mb-2">Arena Stats</div>
        <div className="space-y-1.5 text-xs text-slate-400">
          <div>🧠 Memory: {arenaState.stats.memoryGamesCompleted}</div>
          <div>🐞 Bugs: {arenaState.stats.bugsFixed}</div>
          <div>🧩 Logic: {arenaState.stats.logicPuzzlesCompleted}</div>
          <div>🗺️ Worlds: {arenaState.stats.worldsCompleted.length}/{STORY_WORLDS.length}</div>
        </div>
      </div>
    </GlassPanel>
  );

  const MainContent = () => {
    // Active game takes full content area
    if (activeGame && activeGame !== "story") {
      return (
        <GlassPanel className="flex-1 p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-5">
            <button type="button" onClick={() => setActiveGame(null)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 transition">← Back</button>
            <span className="text-sm text-slate-400">{QUICK_GAMES.find(g => g.id === activeGame)?.icon} {QUICK_GAMES.find(g => g.id === activeGame)?.label}</span>
          </div>
          {activeGame === "memory" && <MemoryMatch onComplete={(r, s) => handleQuickGameComplete("memory", r, s)} onQuit={() => setActiveGame(null)} />}
          {activeGame === "bug" && <BugHunt onComplete={(r, s) => handleQuickGameComplete("bug", r, s)} onQuit={() => setActiveGame(null)} />}
          {activeGame === "algorithm" && <AlgorithmArrange onComplete={(r, s) => handleQuickGameComplete("algorithm", r, s)} onQuit={() => setActiveGame(null)} />}
          {activeGame === "logic" && <LogicPuzzle onComplete={(r, s) => handleQuickGameComplete("logic", r, s)} onQuit={() => setActiveGame(null)} />}
        </GlassPanel>
      );
    }

    if (activeGame === "story") {
      return (
        <GlassPanel className="flex-1 p-5 sm:p-6">
          <StoryMode xp={xp} completedMissions={arenaState.completedMissions} onMissionComplete={handleMissionComplete} onQuit={() => setActiveGame(null)} />
        </GlassPanel>
      );
    }

    // ── Home ────────────────────────────────────────────────────────────────────
    if (section === "home") {
      return (
        <div className="flex-1 space-y-6">
          <GlassPanel className="relative overflow-hidden p-5 sm:p-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.2),_transparent_55%)]" />
            <div className="relative">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-600 to-violet-600 text-3xl shrink-0 shadow-lg">🎮</div>
                <div>
                  <h1 className="text-2xl font-bold text-white sm:text-3xl">Mini Games Arena</h1>
                  <p className="mt-1 text-sm text-slate-400">Learn Java through interactive games, story adventures, and daily challenges.</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-cyan-500/15 border border-cyan-500/25 px-3 py-1 text-cyan-300">⚡ Total XP earned: {arenaState.stats.totalXpEarned}</span>
                    <span className="rounded-full bg-violet-500/15 border border-violet-500/25 px-3 py-1 text-violet-300">🎮 Games played: {arenaState.stats.gamesPlayed}</span>
                    {!isDailyDone && <span className="rounded-full bg-amber-500/15 border border-amber-500/25 px-3 py-1 text-amber-300 animate-pulse">📅 Daily challenge available!</span>}
                  </div>
                </div>
              </div>
            </div>
          </GlassPanel>

          {newAchievements.length > 0 && (
            <GlassPanel className="border-emerald-400/30 bg-emerald-500/10 p-4">
              <div className="text-sm font-bold text-white mb-2">🏅 New Achievement{newAchievements.length > 1 ? "s" : ""} Unlocked!</div>
              <div className="flex flex-wrap gap-2">
                {newAchievements.map(a => <span key={a.id} className="rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-xs text-emerald-200">{a.badge} {a.title}</span>)}
              </div>
            </GlassPanel>
          )}

          {/* Quick play grid */}
          <div>
            <div className="text-xs uppercase tracking-widest text-slate-500 mb-3">Quick Play</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {QUICK_GAMES.map(game => (
                <motion.button key={game.id} type="button" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  onClick={() => setActiveGame(game.id as ActiveGame)}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 hover:border-cyan-400/25 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-2xl">{game.icon}</div>
                    <div className="flex gap-1 text-[10px]">
                      <span className="rounded-full bg-cyan-500/15 border border-cyan-500/20 px-2 py-0.5 text-cyan-300">+{game.xp} XP</span>
                    </div>
                  </div>
                  <div className="mt-2 font-semibold text-white text-sm">{game.label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{game.desc}</div>
                  <div className="mt-2 flex gap-3 text-[10px] text-slate-500">
                    <span>{game.difficulty}</span><span>•</span><span>{game.time}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Story Mode card */}
          <motion.button type="button" whileHover={{ scale: 1.005 }} onClick={() => { setSection("story"); setActiveGame("story"); }}
            className="w-full rounded-2xl border border-violet-400/25 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 p-5 text-left hover:from-violet-500/15 hover:to-fuchsia-500/15 transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-white">📖 Story Mode</div>
                <div className="text-xs text-slate-400 mt-1">5 worlds · 20 missions · Boss battles · Rare achievements</div>
                <div className="mt-2 flex gap-1 flex-wrap">
                  {STORY_WORLDS.map(w => <span key={w.id} className="text-sm" title={w.name}>{w.icon}</span>)}
                </div>
              </div>
              <div className="text-right text-xs text-slate-400">
                <div>{arenaState.completedMissions.length} / {STORY_WORLDS.reduce((a, w) => a + w.missions.length, 0)} done</div>
              </div>
            </div>
          </motion.button>
        </div>
      );
    }

    // ── Quick Games ─────────────────────────────────────────────────────────────
    if (section === "quick") {
      return (
        <div className="flex-1 space-y-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">Quick Games</p>
            <h2 className="text-xl font-bold text-white">Fast Learning Sessions</h2>
            <p className="text-sm text-slate-400 mt-1">30–120 second games to keep your Java skills sharp.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {QUICK_GAMES.map(game => (
              <GlassPanel key={game.id} className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white/10 text-2xl">{game.icon}</div>
                  <div>
                    <div className="font-semibold text-white">{game.label}</div>
                    <div className="text-[11px] text-slate-400">{game.difficulty} · {game.time}</div>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mb-4">{game.desc}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 text-xs">
                    <span className="text-cyan-300">+{game.xp} XP</span>
                    <span className="text-amber-300">+{game.coins} coins</span>
                  </div>
                  <button type="button" onClick={() => setActiveGame(game.id as ActiveGame)} className="rounded-xl bg-gradient-to-r from-cyan-600 to-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90">Play</button>
                </div>
              </GlassPanel>
            ))}
          </div>
        </div>
      );
    }

    // ── Story Mode ──────────────────────────────────────────────────────────────
    if (section === "story") {
      return (
        <GlassPanel className="flex-1 p-5 sm:p-6">
          <StoryMode xp={xp} completedMissions={arenaState.completedMissions} onMissionComplete={handleMissionComplete} onQuit={() => setSection("home")} />
        </GlassPanel>
      );
    }

    // ── Daily Challenge ─────────────────────────────────────────────────────────
    if (section === "daily") {
      const timeLeft = Math.max(0, Math.floor((daily.expiresAt - Date.now()) / 1000 / 60 / 60));
      return (
        <div className="flex-1 space-y-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">Daily Challenge</p>
            <h2 className="text-xl font-bold text-white">Today's Mission</h2>
            <p className="text-sm text-slate-400">Resets in ~{timeLeft}h · Bonus rewards for streak players.</p>
          </div>
          <GlassPanel className={cn("p-6", isDailyDone && "border-emerald-400/30 bg-emerald-500/10")}>
            {isDailyDone ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">🏅</div>
                <div className="text-white font-bold text-lg">Daily Complete!</div>
                <p className="text-slate-400 text-sm mt-2">Come back tomorrow for a new challenge.</p>
                <div className="mt-3 flex justify-center gap-4 text-sm">
                  <span className="text-cyan-300">+{daily.reward.xp} XP earned</span>
                  <span className="text-amber-300">+{daily.reward.coins} coins earned</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-2xl">📅</div>
                  <div>
                    <div className="font-bold text-white">{daily.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">Daily — resets at midnight</div>
                  </div>
                </div>
                <div className="flex gap-3 text-sm">
                  <span className="rounded-full bg-amber-500/15 border border-amber-500/25 px-3 py-1 text-amber-300">+{daily.reward.xp} XP</span>
                  <span className="rounded-full bg-cyan-500/15 border border-cyan-500/25 px-3 py-1 text-cyan-300">+{daily.reward.coins} coins</span>
                  <span className="rounded-full bg-violet-500/15 border border-violet-500/25 px-3 py-1 text-violet-300">🏅 Daily Champ</span>
                </div>
                <button type="button"
                  onClick={() => setActiveGame(daily.type as ActiveGame)}
                  className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-sm font-bold text-white shadow-lg hover:opacity-90 transition"
                >
                  Start Daily Challenge →
                </button>
              </div>
            )}
          </GlassPanel>

          {/* AI recommendation hint */}
          <GlassPanel className="p-4 border-violet-400/20 bg-violet-500/5">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-[11px] font-black text-white shrink-0">AI</div>
              <div>
                <div className="text-sm font-semibold text-white">AI Mentor Tip</div>
                <p className="text-xs text-slate-400 mt-1">
                  {arenaState.stats.bugsFixed < 5 ? "You haven't fixed many bugs yet. Try the Bug Hunt game to sharpen your debugging skills!" :
                   arenaState.stats.logicPuzzlesCompleted < 5 ? "Logic puzzles improve problem-solving speed. Try the Logic Puzzle game today!" :
                   arenaState.stats.worldsCompleted.length < 2 ? "Story Mode worlds are waiting! Each world builds real Java skills through missions." :
                   "You're progressing well! Challenge yourself with the harder Story Mode worlds."}
                </p>
              </div>
            </div>
          </GlassPanel>
        </div>
      );
    }

    // ── Leaderboard ─────────────────────────────────────────────────────────────
    if (section === "leaderboard") {
      const mockLeaders = [
        { name: "NovaByte", xp: 2840, games: 48, badge: "🏆" },
        { name: "KaiThread", xp: 2310, games: 39, badge: "⚔️" },
        { name: "MiraOOP", xp: 1970, games: 33, badge: "🧩" },
        { name: "LoopLynx", xp: 1640, games: 27, badge: "🐞" },
        { name: username, xp: arenaState.stats.totalXpEarned, games: arenaState.stats.gamesPlayed, badge: "🎮" },
      ].sort((a, b) => b.xp - a.xp);

      return (
        <div className="flex-1 space-y-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">Arena Leaderboard</p>
            <h2 className="text-xl font-bold text-white">Top Players</h2>
          </div>
          <GlassPanel className="overflow-hidden">
            <div className="p-5 space-y-3">
              {mockLeaders.map((p, i) => (
                <div key={p.name} className={cn("flex items-center justify-between rounded-xl border px-4 py-3 transition", p.name === username ? "border-cyan-400/30 bg-cyan-500/10" : "border-white/5 bg-white/[0.03]")}>
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold", i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-400 text-white" : i === 2 ? "bg-orange-500 text-white" : "bg-white/10 text-slate-300")}>
                      {i + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{p.name}</div>
                      <div className="text-[10px] text-slate-500">{p.games} games</div>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-cyan-300 font-semibold">{p.xp} XP</div>
                    <div className="text-base">{p.badge}</div>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>

          <GlassPanel className="p-5">
            <div className="text-sm font-semibold text-white mb-4">Achievements</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {ARENA_ACHIEVEMENTS.map(a => {
                const earned = arenaState.earnedAchievements.includes(a.id);
                return (
                  <div key={a.id} className={cn("rounded-xl border px-3 py-2.5 flex items-center gap-2.5", earned ? "border-emerald-400/30 bg-emerald-500/10" : "border-white/5 bg-white/[0.02] opacity-50")}>
                    <span className="text-xl">{a.badge}</span>
                    <div>
                      <div className="text-xs font-semibold text-white">{a.title}</div>
                      <div className="text-[10px] text-slate-400">{a.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassPanel>
        </div>
      );
    }

    return null;
  };

  // Handle daily game completion bridge
  const DailyGameWrapper = () => {
    if (!activeGame || activeGame === "story") return null;
    const isDaily = section === "daily";
    if (!isDaily) return null;
    const handleDone = (r: GameReward, _s: Record<string, number>) => handleDailyComplete(r);
    return (
      <GlassPanel className="flex-1 p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <button type="button" onClick={() => setActiveGame(null)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 transition">← Back</button>
          <span className="text-sm text-amber-300">📅 Daily Challenge</span>
        </div>
        {activeGame === "memory" && <MemoryMatch onComplete={(r, s) => handleDone(r, s)} onQuit={() => setActiveGame(null)} />}
        {activeGame === "bug" && <BugHunt onComplete={(r, s) => handleDone(r, s)} onQuit={() => setActiveGame(null)} />}
        {activeGame === "algorithm" && <AlgorithmArrange onComplete={(r, s) => handleDone(r, s)} onQuit={() => setActiveGame(null)} />}
        {activeGame === "logic" && <LogicPuzzle onComplete={(r, s) => handleDone(r, s)} onQuit={() => setActiveGame(null)} />}
      </GlassPanel>
    );
  };

  return (
    <div className="flex gap-5 pb-12 min-h-[70vh]">
      {/* Desktop sidebar */}
      <div className="hidden lg:block"><Sidebar /></div>

      {/* Mobile nav */}
      <div className="lg:hidden fixed bottom-20 left-3 right-3 z-40">
        <AnimatePresence>
          {mobileSidebarOpen && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
              <GlassPanel className="p-3 flex flex-wrap gap-1">
                {SIDEBAR_SECTIONS.map(s => (
                  <button key={s.id} type="button" onClick={() => setActiveSectionWithClose(s.id)}
                    className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition", section === s.id ? "bg-white/15 text-white" : "text-slate-400 hover:bg-white/8")}
                  >
                    {s.icon} {s.label}
                  </button>
                ))}
              </GlassPanel>
            </motion.div>
          )}
        </AnimatePresence>
        <button type="button" onClick={() => setMobileSidebarOpen(v => !v)}
          className="w-full mt-1 rounded-2xl border border-white/10 bg-[#0b1020]/90 backdrop-blur-xl px-4 py-2 text-xs text-slate-300 text-center flex items-center justify-center gap-2"
        >
          🎮 {SIDEBAR_SECTIONS.find(s => s.id === section)?.label ?? "Arena"} {mobileSidebarOpen ? "▲" : "▼"}
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col gap-5">
        {section === "daily" && activeGame ? <DailyGameWrapper /> : <MainContent />}
      </div>

      {/* Reward toast */}
      <AnimatePresence>
        {toast && <XpToast xp={toast.xp} coins={toast.coins} onDone={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  );
}
