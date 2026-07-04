import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../utils/cn";
import { useJavifyStore } from "../../store/useJavifyStore";
import { challenges, getChallengeById, worlds } from "../../data/javify";
import {
  buildContributionGrid,
  buildReadme,
  connectGitHub,
  createPortfolioRepository,
  disconnectGitHub,
  exportPortfolioMarkdown,
  fetchRepositories,
  getGitHubState,
  refreshConnection,
  syncReadme,
  updateSyncOptions,
} from "./github.service";
import type { GitHubConnection, GitHubRepository, GitHubSyncOptions } from "./github.types";
import { isBackendConfigured } from "../../services/apiClient";

function GlassPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("glass-panel rounded-[28px] border border-gray-200 dark:border-white/10", className)}>{children}</div>;
}

const SYNC_TOGGLES: { key: keyof GitHubSyncOptions; label: string; description: string }[] = [
  { key: "autoCommitOnSolve", label: "Auto-push challenge solutions", description: "Commit each solved challenge to your portfolio repo." },
  { key: "pushAchievements", label: "Auto-push achievements", description: "Record unlocked badges under /Achievements." },
  { key: "pushLearningProgress", label: "Auto-push learning progress", description: "Update README skills section after each session." },
  { key: "pushAnalytics", label: "Push only completed challenges", description: "Skip in-progress drafts; only commit when passed." },
  { key: "pushDailySummaries", label: "Auto-push daily summaries", description: "Generate a daily commit summarizing your activity." },
  { key: "privateRepository", label: "Keep repository private", description: "Use a private GitHub repo instead of public portfolio." },
];

export default function GitHubPanel() {
  const username = useJavifyStore((s) => s.username);
  const email = useJavifyStore((s) => s.email);
  const xp = useJavifyStore((s) => s.xp);
  const level = useJavifyStore((s) => s.level);
  const coins = useJavifyStore((s) => s.coins);
  const streak = useJavifyStore((s) => s.streak);
  const completedChallengeIds = useJavifyStore((s) => s.completedChallengeIds);

  const backendReady = isBackendConfigured();
  const [state, setState] = useState<GitHubConnection>(() => getGitHubState());
  const [repos, setRepos] = useState<GitHubRepository[]>([]);
  const [loading, setLoading] = useState<"connecting" | "disconnecting" | "syncing" | "creating-repo" | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "warn" | "info"; text: string } | null>(null);

  useEffect(() => {
    if (!state.connected || !backendReady) return;
    fetchRepositories()
      .then(setRepos)
      .catch((err) => {
        console.warn("[github] Failed to fetch repos", err);
        if (err?.status === 401) {
          showNotice("warn", "Your GitHub session expired. Please reconnect.");
          setState((s) => ({ ...s, connected: false }));
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.connected, backendReady]);

  const completedChallenges = useMemo(
    () =>
      completedChallengeIds
        .map((id) => getChallengeById(id))
        .filter(Boolean) as NonNullable<ReturnType<typeof getChallengeById>>[],
    [completedChallengeIds]
  );

  const skills = useMemo(() => {
    return worlds.map((w) => {
      const total = challenges.filter((c) => c.worldId === w.id).length;
      const done = challenges.filter((c) => c.worldId === w.id && completedChallengeIds.includes(c.id)).length;
      const percent = total === 0 ? 0 : Math.round((done / total) * 100);
      return { topic: w.topic, percent };
    });
  }, [completedChallengeIds]);

  const achievementList = useMemo(() => {
    const list: string[] = [];
    if (completedChallengeIds.length > 0) list.push("First Challenge");
    if (completedChallengeIds.length >= 3) list.push("Triple Threat");
    if (streak >= 7) list.push("7 Day Streak");
    if (completedChallengeIds.length === challenges.length && challenges.length > 0) list.push("Java Master");
    return list;
  }, [completedChallengeIds, streak]);

  const contributionGrid = useMemo(() => buildContributionGrid(state.recentSyncs), [state.recentSyncs]);

  const showNotice = (kind: "ok" | "warn" | "info", text: string) => {
    setNotice({ kind, text });
    window.setTimeout(() => setNotice(null), 5000);
  };

  const handleError = (error: unknown, fallback: string) => {
    const message = error instanceof Error ? error.message : fallback;
    showNotice("warn", message);
  };

  const handleConnect = async () => {
    setLoading("connecting");
    try {
      const next = await connectGitHub();
      setState(next);
      showNotice("ok", `Connected to GitHub as @${next.profile?.login}.`);
    } catch (error) {
      handleError(error, "Could not connect to GitHub.");
    } finally {
      setLoading(null);
    }
  };

  const handleDisconnect = async () => {
    setLoading("disconnecting");
    try {
      const next = await disconnectGitHub();
      setState(next);
      setRepos([]);
      showNotice("ok", "GitHub disconnected and access revoked.");
    } catch (error) {
      handleError(error, "Could not disconnect GitHub.");
    } finally {
      setLoading(null);
    }
  };

  const handleSyncReadme = async () => {
    setLoading("syncing");
    try {
      const readme = buildReadme({
        username,
        level,
        xp,
        streak,
        completedCount: completedChallengeIds.length,
        achievements: achievementList,
        recentSyncs: state.recentSyncs,
        skills,
      });
      await syncReadme(readme);
      setState(getGitHubState());
      showNotice("ok", "README synced to your portfolio repository.");
    } catch (error) {
      handleError(error, "README sync failed.");
    } finally {
      setLoading(null);
    }
  };

  const handleCreateRepo = async () => {
    setLoading("creating-repo");
    try {
      const repo = await createPortfolioRepository();
      const next = await refreshConnection();
      setState(next);
      const refreshed = await fetchRepositories();
      setRepos(refreshed);
      showNotice("ok", `Repository ready: ${repo.name}`);
    } catch (error) {
      handleError(error, "Could not create Javify repository.");
    } finally {
      setLoading(null);
    }
  };

  const handleToggle = (key: keyof GitHubSyncOptions) => {
    const next = updateSyncOptions({ [key]: !state.syncOptions[key] });
    setState(next);
  };

  const handleExportPortfolio = () => {
    exportPortfolioMarkdown({
      username,
      email,
      level,
      xp,
      coins,
      streak,
      challenges: completedChallenges.map((c) => ({ title: c.title, difficulty: c.difficulty, xpReward: c.xpReward })),
      achievements: achievementList.map((a) => ({ title: a, description: `Earned through Javify progress: ${a}` })),
      recentSyncs: state.recentSyncs,
    });
    showNotice("ok", "Portfolio markdown downloaded.");
  };

  return (
    <GlassPanel className="overflow-hidden p-6 sm:p-7">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 text-white shadow-lg">
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.02c-3.2.7-3.87-1.38-3.87-1.38-.52-1.34-1.28-1.7-1.28-1.7-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.16 1.18A10.9 10.9 0 0 1 12 6.15c.98 0 1.96.13 2.88.39 2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.42-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.16c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
            </svg>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-gray-500 dark:text-slate-400">Profile → Integrations</p>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">GitHub Integration</h3>
          </div>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest",
            state.connected
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-slate-400"
          )}
        >
          {state.connected ? "Connected" : "Not connected"}
        </span>
      </div>



      {/* Notice */}
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={cn(
              "mt-4 rounded-xl border px-4 py-2.5 text-xs",
              notice.kind === "ok" && "border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
              notice.kind === "warn" && "border-amber-400/30 bg-amber-500/10 text-amber-700 dark:text-amber-200",
              notice.kind === "info" && "border-cyan-400/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200"
            )}
          >
            {notice.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Disconnected state */}
      {!state.connected && (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-6 text-center">
          <p className="text-sm text-gray-700 dark:text-slate-300">
            Connect your real GitHub account to automatically turn every solved challenge into a public portfolio commit.
          </p>
          <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
            We'll create a repository called <span className="font-mono text-gray-700 dark:text-slate-200">Javify-Learning-Progress</span> after you authorize Javify on GitHub.
          </p>
          <button
            type="button"
            onClick={handleConnect}
            disabled={!backendReady || loading === "connecting"}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.02c-3.2.7-3.87-1.38-3.87-1.38-.52-1.34-1.28-1.7-1.28-1.7-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.16 1.18A10.9 10.9 0 0 1 12 6.15c.98 0 1.96.13 2.88.39 2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.42-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.16c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
            </svg>
            {loading === "connecting" ? "Authorizing on GitHub…" : "Connect GitHub"}
          </button>
          {backendReady && (
            <p className="mt-3 text-[11px] text-gray-500 dark:text-slate-500">
              You'll be redirected to github.com to authorize Javify securely.
            </p>
          )}
        </div>
      )}

      {/* Connected state */}
      {state.connected && state.profile && (
        <div className="mt-6 space-y-6">
          {/* Profile card */}
          <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <img
                src={state.profile.avatar_url}
                alt={state.profile.login}
                className="h-14 w-14 rounded-2xl ring-2 ring-white dark:ring-white/10"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={state.profile.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-base font-semibold text-gray-900 dark:text-white hover:underline"
                  >
                    @{state.profile.login}
                  </a>
                  {state.profile.name && (
                    <span className="text-xs text-gray-500 dark:text-slate-400">· {state.profile.name}</span>
                  )}
                </div>
                {state.profile.bio && (
                  <p className="mt-1 text-xs text-gray-600 dark:text-slate-300 line-clamp-1">{state.profile.bio}</p>
                )}
                <div className="mt-1 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-slate-400">
                  <span>📦 {state.profile.public_repos} repos</span>
                  <span>👥 {state.profile.followers} followers</span>
                  <span>🔁 {state.profile.following} following</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSyncReadme}
                disabled={loading === "syncing"}
                className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-700 dark:text-cyan-300 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading === "syncing" ? "Syncing…" : "Sync Progress"}
              </button>
              <button
                type="button"
                onClick={handleCreateRepo}
                disabled={loading === "creating-repo"}
                className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading === "creating-repo" ? "Creating…" : "Create Javify Repository"}
              </button>
              <button
                type="button"
                onClick={handleExportPortfolio}
                className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs font-medium text-violet-700 dark:text-violet-300 transition hover:bg-violet-500/15"
              >
                Export Journey
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={loading === "disconnecting"}
                className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-700 dark:text-rose-300 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading === "disconnecting" ? "Revoking…" : "Disconnect"}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Commits This Week" value={state.commitsThisWeek} accent="from-cyan-500 to-blue-500" />
            <Stat label="Total Commits" value={state.totalCommits} accent="from-violet-500 to-fuchsia-500" />
            <Stat label="Portfolio Repo" value={repos.find((r) => r.name === state.repositoryName) ? "Active" : "Pending"} accent="from-emerald-500 to-teal-500" />
          </div>

          {/* Real repository list */}
          {repos.length > 0 && (
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] p-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Your GitHub Repositories</h4>
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Most recently updated repos from your account.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {repos.slice(0, 6).map((repo) => (
                  <a
                    key={repo.id}
                    href={repo.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 px-3 py-2.5 transition hover:bg-gray-100 dark:hover:bg-white/10"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-gray-900 dark:text-white">{repo.name}</span>
                      <span className="shrink-0 text-[10px] text-gray-500 dark:text-slate-400">⭐ {repo.stargazers_count}</span>
                    </div>
                    {repo.description && (
                      <p className="mt-1 line-clamp-1 text-[11px] text-gray-500 dark:text-slate-400">{repo.description}</p>
                    )}
                    <div className="mt-1 flex items-center gap-3 text-[10px] text-gray-400 dark:text-slate-500">
                      {repo.language && <span>{repo.language}</span>}
                      <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Sync options */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] p-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Sync Preferences</h4>
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Choose what to push to your GitHub portfolio.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {SYNC_TOGGLES.map((option) => {
                const active = state.syncOptions[option.key];
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => handleToggle(option.key)}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3 text-left transition",
                      active
                        ? "border-cyan-400/40 bg-cyan-500/10"
                        : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
                        active
                          ? "border-cyan-500 bg-cyan-500 text-white"
                          : "border-gray-300 dark:border-white/20 bg-white dark:bg-transparent"
                      )}
                    >
                      {active ? "✓" : ""}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-gray-900 dark:text-white">{option.label}</span>
                      <span className="block text-[11px] text-gray-500 dark:text-slate-400">{option.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contribution calendar */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Javify Contribution Calendar</h4>
              <span className="text-[11px] text-gray-500 dark:text-slate-400">Last 12 weeks</span>
            </div>
            <div className="mt-3 grid grid-cols-12 gap-1 sm:grid-cols-14">
              {contributionGrid.map((day) => {
                const intensity = day.count === 0 ? 0 : day.count === 1 ? 1 : day.count === 2 ? 2 : 3;
                const palette = [
                  "bg-gray-100 dark:bg-white/5",
                  "bg-cyan-200 dark:bg-cyan-700/50",
                  "bg-cyan-400 dark:bg-cyan-500",
                  "bg-violet-500",
                ];
                return (
                  <div
                    key={day.date}
                    title={`${day.date}: ${day.count} commit${day.count === 1 ? "" : "s"}`}
                    className={cn("h-3.5 w-3.5 rounded-[3px]", palette[intensity])}
                  />
                );
              })}
            </div>
          </div>

          {/* Recent activity */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Recent GitHub Activity</h4>
              {state.repositoryUrl && (
                <a
                  href={state.repositoryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-cyan-700 dark:text-cyan-300 hover:underline"
                >
                  Open repository ↗
                </a>
              )}
            </div>
            <div className="mt-3 space-y-2">
              {state.recentSyncs.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Solve a challenge with auto-commit enabled to see activity here.
                </p>
              ) : (
                state.recentSyncs.slice(0, 6).map((s) => (
                  <div
                    key={s.id}
                    className={cn(
                      "flex items-start justify-between gap-3 rounded-xl border px-3 py-2",
                      s.status === "success"
                        ? "border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5"
                        : "border-rose-300/30 bg-rose-50 dark:bg-rose-500/10"
                    )}
                  >
                    <div className="min-w-0">
                      <div
                        className={cn(
                          "text-xs font-medium truncate",
                          s.status === "success" ? "text-gray-900 dark:text-white" : "text-rose-700 dark:text-rose-200"
                        )}
                      >
                        {s.status === "success" ? "✓" : "✗"} {s.message}
                      </div>
                      {s.filePath && (
                        <div className="text-[10px] text-gray-500 dark:text-slate-400 font-mono truncate">{s.filePath}</div>
                      )}
                    </div>
                    <div className="shrink-0 text-[10px] text-gray-400 dark:text-slate-500">
                      {new Date(s.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </GlassPanel>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] p-4">
      <div className={cn("absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br opacity-20 blur-2xl", accent)} />
      <div className="relative">
        <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
        <div className="mt-1 text-[10px] uppercase tracking-widest text-gray-500 dark:text-slate-400">{label}</div>
      </div>
    </div>
  );
}
