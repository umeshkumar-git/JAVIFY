import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { leaderboard as baseLeaderboard } from "../../data/javify";
import { useJavifyStore } from "../../store/useJavifyStore";
import { cn } from "../../utils/cn";

function GlassPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("glass-panel rounded-[28px] border border-white/10", className)}>{children}</div>;
}

type Period = "weekly" | "monthly" | "all-time";

export default function Leaderboard() {
  const username = useJavifyStore((s) => s.username);
  const xp = useJavifyStore((s) => s.xp);
  const level = useJavifyStore((s) => s.level);
  const streak = useJavifyStore((s) => s.streak);
  const [period, setPeriod] = useState<Period>("all-time");

  // Inject current player into the ranking
  const entries = useMemo(() => {
    const me = { rank: 0, name: username, xp, level, streak, title: "You" };
    const multipliers: Record<Period, number> = {
      weekly: 0.15,
      monthly: 0.45,
      "all-time": 1,
    };
    const factor = multipliers[period];
    const adjusted = baseLeaderboard.map((e) => ({
      ...e,
      xp: Math.round(e.xp * factor),
    }));
    const combined = [...adjusted, me].sort((a, b) => b.xp - a.xp).map((e, i) => ({
      ...e,
      rank: i + 1,
    }));
    return combined;
  }, [period, username, xp, level, streak]);

  const myEntry = entries.find((e) => e.name === username);

  return (
    <div className="space-y-6 pb-10">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-400 text-lg shadow-lg">
            🏆
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-amber-300">Global Rankings</p>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Leaderboard</h1>
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-400">
          Climb the ranks across weekly, monthly, and all-time competitive ladders.
        </p>
      </div>

      {/* Period switcher */}
      <div className="flex rounded-2xl border border-white/10 bg-white/5 p-1 text-sm">
        {(["weekly", "monthly", "all-time"] as Period[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={cn(
              "flex-1 rounded-xl px-3 py-2 capitalize transition",
              period === p ? "bg-white/12 text-white" : "text-slate-400 hover:text-white"
            )}
          >
            {p.replace("-", " ")}
          </button>
        ))}
      </div>

      {/* My rank highlight */}
      {myEntry && (
        <GlassPanel className="p-5 border-cyan-400/30 bg-cyan-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 text-lg font-bold text-white shadow-lg">
                #{myEntry.rank}
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-cyan-300">Your Position</div>
                <div className="text-lg font-bold text-white">{myEntry.name}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{myEntry.xp.toLocaleString()}</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400">XP</div>
            </div>
          </div>
        </GlassPanel>
      )}

      {/* Top 10 list */}
      <GlassPanel className="overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            Top {Math.min(entries.length, 10)} Operatives
          </h3>
          <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400">
            {period.replace("-", " ")}
          </span>
        </div>
        <div className="divide-y divide-white/10">
          {entries.slice(0, 10).map((entry, i) => (
            <motion.div
              key={entry.name}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={cn(
                "flex items-center justify-between px-5 py-3.5 transition",
                entry.name === username ? "bg-cyan-500/15" : "hover:bg-white/5"
              )}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl font-bold text-sm shadow",
                    entry.rank === 1
                      ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 font-extrabold shadow-amber-500/30"
                      : entry.rank === 2
                        ? "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950 font-extrabold shadow-slate-400/20"
                        : entry.rank === 3
                          ? "bg-gradient-to-br from-orange-400 to-amber-600 text-slate-950 font-extrabold shadow-orange-500/20"
                          : "bg-white/10 border border-white/15 text-white font-bold"
                  )}
                >
                  {entry.rank}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>{entry.name}</span>
                    {entry.name === username && (
                      <span className="rounded-full bg-cyan-500/20 border border-cyan-400/30 px-1.5 py-0.2 text-[9px] font-mono text-cyan-300">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-300 font-medium">
                    {entry.title} · Lvl {entry.level}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-right">
                  <div className="text-white font-bold tracking-tight">{entry.xp.toLocaleString()}</div>
                  <div className="text-[10px] uppercase font-mono tracking-widest text-slate-400">XP</div>
                </div>
                <div className="text-right hidden sm:block">
                  <div className="text-cyan-300 font-bold">{entry.streak}d</div>
                  <div className="text-[10px] uppercase font-mono tracking-widest text-slate-400">streak</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}
