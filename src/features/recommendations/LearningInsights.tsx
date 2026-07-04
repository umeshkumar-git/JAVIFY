import { useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useJavifyStore } from "../../store/useJavifyStore";
import { challenges, worlds } from "../../data/javify";
import { cn } from "../../utils/cn";

function GlassPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("glass-panel rounded-[28px] border border-white/10", className)}>{children}</div>;
}

interface CategoryStats {
  category: string;
  attempts: number;
  passed: number;
  successRate: number;
}

export default function LearningInsights() {
  const completedChallengeIds = useJavifyStore((s) => s.completedChallengeIds);
  const failedRuns = useJavifyStore((s) => s.failedRuns);
  const runCount = useJavifyStore((s) => s.runCount);
  const hintedChallengeIds = useJavifyStore((s) => s.hintedChallengeIds);

  // Derive per-world stats
  const stats = useMemo<CategoryStats[]>(() => {
    return worlds.map((world) => {
      const worldChallenges = challenges.filter((c) => c.worldId === world.id);
      const passed = worldChallenges.filter((c) => completedChallengeIds.includes(c.id)).length;
      const hintedInWorld = worldChallenges.filter((c) => hintedChallengeIds.includes(c.id)).length;
      const attempts = passed + hintedInWorld;
      return {
        category: world.topic,
        attempts,
        passed,
        successRate: attempts === 0 ? 0 : passed / attempts,
      };
    });
  }, [completedChallengeIds, hintedChallengeIds]);

  const weakTopics = stats.filter((s) => s.attempts > 0 && s.successRate < 0.6);
  const strongTopics = stats.filter((s) => s.attempts > 0 && s.successRate >= 0.8);
  const untouchedTopics = stats.filter((s) => s.attempts === 0);

  // Suggested next challenges = first unsolved in weakest world, then progression order
  const suggestedChallenges = useMemo(() => {
    const orderedWorlds = [...worlds].sort((a, b) => {
      const aStat = stats.find((s) => s.category === a.topic);
      const bStat = stats.find((s) => s.category === b.topic);
      return (aStat?.successRate ?? 1) - (bStat?.successRate ?? 1);
    });
    const recs: typeof challenges = [];
    for (const w of orderedWorlds) {
      const next = challenges.find(
        (c) => c.worldId === w.id && !completedChallengeIds.includes(c.id)
      );
      if (next) recs.push(next);
      if (recs.length >= 4) break;
    }
    return recs;
  }, [completedChallengeIds, stats]);

  const overallSuccessRate =
    runCount === 0 ? 0 : Math.round(((runCount - failedRuns) / runCount) * 100);

  return (
    <div className="space-y-6 pb-10">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-lg shadow-lg text-white">
            🎯
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-emerald-600 dark:text-emerald-300">Adaptive Learning</p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">Learning Insights</h1>
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
          Personalized recommendations powered by your progress data.
        </p>
      </div>

      {/* Top Metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <GlassPanel className="p-5">
          <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-slate-400">Overall Success Rate</p>
          <div className="mt-3 text-3xl font-bold text-emerald-600 dark:text-emerald-300">{overallSuccessRate}%</div>
          <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">{runCount - failedRuns}/{runCount} runs passed</p>
        </GlassPanel>
        <GlassPanel className="p-5">
          <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-slate-400">Strengths</p>
          <div className="mt-3 text-3xl font-bold text-cyan-600 dark:text-cyan-300">{strongTopics.length}</div>
          <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">mastered topics</p>
        </GlassPanel>
        <GlassPanel className="p-5">
          <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-slate-400">Focus Areas</p>
          <div className="mt-3 text-3xl font-bold text-rose-600 dark:text-rose-300">{weakTopics.length}</div>
          <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">need attention</p>
        </GlassPanel>
      </div>

      {/* Suggested Path */}
      <GlassPanel className="p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Recommended Next Steps</h3>
        <p className="text-xs text-gray-500 dark:text-slate-500 mb-5">Tailored to your strengths and gaps.</p>
        {suggestedChallenges.length === 0 ? (
          <div className="text-center py-6 text-gray-400 dark:text-slate-500">
            🎉 You've completed everything! Stay tuned for new challenges.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {suggestedChallenges.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Link
                  to={`/challenge/${c.id}`}
                  className="block rounded-2xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4 transition hover:bg-gray-100 dark:hover:bg-white/10 hover:border-cyan-400/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-cyan-600 dark:text-cyan-300 uppercase tracking-widest">
                      {worlds.find((w) => w.id === c.worldId)?.topic ?? "Challenge"}
                    </div>
                    <div className="text-[10px] rounded-full bg-violet-500/20 px-2 py-0.5 text-violet-700 dark:text-violet-300">
                      {c.difficulty}
                    </div>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{c.title}</div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                    +{c.xpReward} XP · +{c.coinsReward} coins
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </GlassPanel>

      {/* Weak / Strong breakdowns */}
      <div className="grid gap-6 lg:grid-cols-2">
        <GlassPanel className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Areas to Improve</h3>
          <p className="text-xs text-gray-500 dark:text-slate-500 mb-4">Topics where you struggle</p>
          {weakTopics.length === 0 ? (
            <div className="text-center py-6 text-emerald-600 dark:text-emerald-400 text-sm">
              🌟 No weak topics detected
            </div>
          ) : (
            <div className="space-y-2">
              {weakTopics.map((s) => (
                <div
                  key={s.category}
                  className="flex items-center justify-between rounded-xl border border-rose-400/15 bg-rose-500/5 px-3 py-2.5"
                >
                  <span className="text-sm text-rose-700 dark:text-rose-200">{s.category}</span>
                  <span className="text-xs text-rose-600/70 dark:text-rose-300/70">
                    {Math.round(s.successRate * 100)}% success
                  </span>
                </div>
              ))}
            </div>
          )}
        </GlassPanel>

        <GlassPanel className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Your Strengths</h3>
          <p className="text-xs text-gray-500 dark:text-slate-500 mb-4">Topics you've mastered</p>
          {strongTopics.length === 0 ? (
            <div className="text-center py-6 text-gray-400 dark:text-slate-500 text-sm">
              Complete more challenges to unlock insights
            </div>
          ) : (
            <div className="space-y-2">
              {strongTopics.map((s) => (
                <div
                  key={s.category}
                  className="flex items-center justify-between rounded-xl border border-emerald-400/15 bg-emerald-500/5 px-3 py-2.5"
                >
                  <span className="text-sm text-emerald-700 dark:text-emerald-200">{s.category}</span>
                  <span className="text-xs text-emerald-600/70 dark:text-emerald-300/70">
                    {Math.round(s.successRate * 100)}% success
                  </span>
                </div>
              ))}
            </div>
          )}
        </GlassPanel>
      </div>

      {/* Unexplored */}
      {untouchedTopics.length > 0 && (
        <GlassPanel className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Unexplored Worlds</h3>
          <div className="flex flex-wrap gap-2">
            {untouchedTopics.map((s) => (
              <span
                key={s.category}
                className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs text-violet-700 dark:text-violet-200"
              >
                {s.category}
              </span>
            ))}
          </div>
        </GlassPanel>
      )}
    </div>
  );
}
