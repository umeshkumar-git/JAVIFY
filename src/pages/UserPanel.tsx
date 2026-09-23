import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useJavifyStore } from "../store/useJavifyStore";
import { getCompletionPercentage, getXpToNextLevel } from "../store/useJavifyStore";
import { cn } from "../utils/cn";
import { recordActivity } from "../services/analytics";
import { challenges, worlds } from "../data/javify";
import { loadShareAnalytics } from "../features/certifications/certificateUtils";
import GitHubPanel from "../features/github/GitHubPanel";

function GlassPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("glass-panel rounded-[28px] border border-white/10", className)}>{children}</div>;
}

function getPlayerTitle(level: number) {
  if (level >= 12) return "Grandmaster Lambda";
  if (level >= 9) return "Thread Paladin";
  if (level >= 6) return "OOP Vanguard";
  if (level >= 3) return "Byte Ranger";
  return "Java Apprentice";
}

export default function UserPanel() {
  const navigate = useNavigate();
  const username = useJavifyStore((state) => state.username);
  const email = useJavifyStore((state) => state.email);
  const xp = useJavifyStore((state) => state.xp);
  const level = useJavifyStore((state) => state.level);
  const coins = useJavifyStore((state) => state.coins);
  const streak = useJavifyStore((state) => state.streak);
  const role = useJavifyStore((state) => state.role);
  const completedChallengeIds = useJavifyStore((state) => state.completedChallengeIds);
  const runCount = useJavifyStore((state) => state.runCount);
  const failedRuns = useJavifyStore((state) => state.failedRuns);
  const logout = useJavifyStore((state) => state.logout);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(username);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // tracked globally by AppLayout
  }, []);

  const progressPercent = getCompletionPercentage(completedChallengeIds);
  const xpToNext = getXpToNextLevel(xp);
  const playerTitle = getPlayerTitle(level);

  const handleSaveName = () => {
    if (editName.trim().length >= 2) {
      useJavifyStore.setState({ username: editName.trim() });
      recordActivity(username, "updated_profile", `Changed display name to "${editName.trim()}"`);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const shareStats = loadShareAnalytics();

  const achievements = [
    {
      title: "First Compilation",
      description: "Run code for the first time",
      unlocked: runCount > 0,
      accent: "from-cyan-400 to-blue-500",
    },
    {
      title: "Loop Master",
      description: "Clear the Loop Dungeon",
      unlocked: completedChallengeIds.includes("counting-runes"),
      accent: "from-emerald-400 to-cyan-500",
    },
    {
      title: "OOP Warrior",
      description: "Defeat the constructor boss",
      unlocked: completedChallengeIds.includes("hero-blueprint"),
      accent: "from-amber-400 to-orange-500",
    },
    {
      title: "Bug Hunter",
      description: "Persist through 3 failed runs",
      unlocked: failedRuns >= 3 || completedChallengeIds.includes("recovery-shield"),
      accent: "from-rose-400 to-pink-500",
    },
    {
      title: "Java Grandmaster",
      description: "Complete every world",
      unlocked: completedChallengeIds.length === challenges.length,
      accent: "from-fuchsia-400 to-violet-500",
    },
    {
      title: "📢 Shared Learner",
      description: "Shared your first certificate",
      unlocked: shareStats.totalShares >= 1,
      accent: "from-amber-400 to-orange-500",
    },
    {
      title: "🌟 Community Star",
      description: "Shared 5 certificates",
      unlocked: shareStats.totalShares >= 5,
      accent: "from-yellow-400 to-amber-500",
    },
    {
      title: "🎓 Certified Expert",
      description: "Earned all 4 certifications",
      unlocked: completedChallengeIds.length >= challenges.length && xp >= 2300,
      accent: "from-violet-400 to-fuchsia-500",
    },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Profile Header */}
      <GlassPanel className="relative overflow-hidden p-6 sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,217,255,0.16),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(255,77,157,0.18),_transparent_32%)]" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-600 to-cyan-500 text-3xl font-black text-white shadow-[0_12px_32px_rgba(139,92,246,0.4)]">
              {username.charAt(0).toUpperCase()}
            </div>
            <div>
              {editing ? (
                <div className="flex items-center gap-3">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-lg font-bold text-white outline-none focus:border-cyan-400/40"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSaveName}
                    className="rounded-xl bg-cyan-500/20 px-4 py-2 text-sm text-cyan-300 transition hover:bg-cyan-500/30"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="rounded-xl bg-white/5 px-3 py-2 text-sm text-slate-400 transition hover:bg-white/10 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-white sm:text-3xl">{username}</h1>
                  <button
                    type="button"
                    onClick={() => { setEditing(true); setEditName(username); }}
                    className="rounded-xl bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                    title="Edit name"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" />
                    </svg>
                  </button>
                </div>
              )}
              <p className="mt-1 text-sm text-slate-400">{email}</p>
              {saved && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-3 py-1 text-xs text-emerald-300"
                >
                  ✓ Name updated!
                </motion.div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
              {playerTitle}
            </span>
            <span className="rounded-full border border-violet-300/20 bg-violet-500/10 px-4 py-2 text-sm text-violet-200">
              Level {level}
            </span>
            {role === "admin" && (
              <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-4 py-2 text-sm text-amber-200">
                Admin
              </span>
            )}
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="mt-8 space-y-3">
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>{xp} XP collected</span>
            <span className="text-cyan-300">{xpToNext} XP to Level {level + 1}</span>
          </div>
          <div className="progress-3d h-4 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="progress-3d-fill h-full rounded-full bg-gradient-to-r from-cyan-400 via-violet-500 to-fuchsia-500"
              initial={{ width: 0 }}
              animate={{ width: `${(xp % 250) / 2.5}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
      </GlassPanel>

      {/* Stats Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <GlassPanel className="p-5">
          <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Campaign Progress</p>
          <div className="mt-3 text-3xl font-bold text-white">{progressPercent}%</div>
          <p className="mt-2 text-sm text-slate-300">{completedChallengeIds.length}/{challenges.length} missions</p>
        </GlassPanel>
        <GlassPanel className="p-5">
          <p className="text-xs uppercase tracking-[0.32em] text-slate-400">🔥 Daily Streak</p>
          <div className="mt-3 text-3xl font-bold text-white streak-fire">{streak}d</div>
          <p className="mt-2 text-sm text-slate-300">Keep the fire burning!</p>
        </GlassPanel>
        <GlassPanel className="p-5">
          <p className="text-xs uppercase tracking-[0.32em] text-slate-400">🪙 Coins</p>
          <div className="mt-3 text-3xl font-bold text-white">{coins}</div>
          <p className="mt-2 text-sm text-slate-300">For inventory & rewards</p>
        </GlassPanel>
        <GlassPanel className="p-5">
          <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Code Runs</p>
          <div className="mt-3 text-3xl font-bold text-white">{runCount}</div>
          <p className="mt-2 text-sm text-slate-300">{failedRuns} debug attempts</p>
        </GlassPanel>
      </div>

      {/* Achievements */}
      <GlassPanel className="p-6 sm:p-8">
        <h3 className="text-lg font-semibold text-white">Achievements</h3>
        <p className="mt-1 text-sm text-slate-400">Milestones that reward growth and persistence</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((achievement) => (
            <div
              key={achievement.title}
              className={cn(
                "rounded-2xl border p-5 transition",
                achievement.unlocked
                  ? "border-cyan-300/25 bg-cyan-400/10"
                  : "border-white/10 bg-white/5 opacity-60"
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="text-base font-semibold text-white">{achievement.title}</div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.24em]",
                    achievement.unlocked 
                      ? "bg-white/15 text-cyan-200" 
                      : "bg-white/8 text-slate-400"
                  )}
                >
                  {achievement.unlocked ? "Unlocked" : "Locked"}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-300">{achievement.description}</p>
            </div>
          ))}
        </div>
      </GlassPanel>

      {/* World Progress */}
      <GlassPanel className="p-6 sm:p-8">
        <h3 className="text-lg font-semibold text-white">World Progress</h3>
        <p className="mt-1 text-sm text-slate-400">Your journey through the Java universe</p>
        <div className="mt-6 space-y-3">
          {worlds.map((world) => {
            const completed = world.challengeIds.every((id) => completedChallengeIds.includes(id));
            const unlocked =
              world.id === "forest-variables" ||
              worlds.some(
                (w, i) =>
                  i < worlds.findIndex((ww) => ww.id === world.id) &&
                  w.challengeIds.every((id) => completedChallengeIds.includes(id))
              );

            return (
              <div key={world.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{world.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-white">{world.name}</div>
                    <div className="text-xs text-slate-400">{world.topic}</div>
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs uppercase tracking-[0.24em]",
                    completed
                      ? "bg-emerald-400/15 text-emerald-200"
                      : unlocked
                        ? "bg-cyan-400/15 text-cyan-200"
                        : "bg-white/8 text-slate-400"
                  )}
                >
                  {completed ? "Done" : unlocked ? "Active" : "Locked"}
                </span>
              </div>
            );
          })}
        </div>
      </GlassPanel>

      {/* GitHub Integration */}
      <GitHubPanel />

      {/* Account Actions */}
      <GlassPanel className="p-6 sm:p-8">
        <h3 className="text-lg font-semibold text-white">Account Settings</h3>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left text-sm text-slate-200 transition hover:bg-white/10"
          >
            <div className="text-base">🏠 Dashboard</div>
            <div className="mt-1 text-xs text-slate-400">Return to your command center</div>
          </button>
          <button
            type="button"
            onClick={() => navigate("/map")}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left text-sm text-slate-200 transition hover:bg-white/10"
          >
            <div className="text-base">🗺️ World Map</div>
            <div className="mt-1 text-xs text-slate-400">View your campaign progress</div>
          </button>
          {role === "admin" && (
            <button
              type="button"
              onClick={() => navigate("/admin")}
              className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-left text-sm text-amber-200 transition hover:bg-amber-400/15"
            >
              <div className="text-base"> Admin Panel</div>
              <div className="mt-1 text-xs text-amber-300/70">View analytics & users</div>
            </button>
          )}
          <button
            type="button"
            onClick={logout}
            className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-left text-sm text-rose-200 transition hover:bg-rose-400/15"
          >
            <div className="text-base">🚪 Logout</div>
            <div className="mt-1 text-xs text-rose-300/70">Sign out of your account</div>
          </button>
        </div>
      </GlassPanel>
    </div>
  );
}
