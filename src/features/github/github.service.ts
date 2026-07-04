/**
 * GitHub Integration Service - REAL OAUTH ONLY
 *
 * All GitHub operations are routed through the backend OAuth proxy.
 * Access tokens are NEVER stored on the frontend. Backend must be
 * configured with GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and
 * GITHUB_CALLBACK_URL for this integration to function.
 */

import { apiRequest, getApiBaseUrl, tokenStore } from "../../services/apiClient";
import type {
  GitHubConnection,
  GitHubProfile,
  GitHubPushPayload,
  GitHubRepository,
  GitHubSyncOptions,
  GitHubSyncRecord,
} from "./github.types";
import { DEFAULT_REPO_NAME, DEFAULT_SYNC_OPTIONS } from "./github.types";

const STATE_KEY = "javify-github-state";

/* ─── Local persistence (metadata only — never tokens) ─────────────── */
function readState(): GitHubConnection {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return emptyConnection();
    const parsed = JSON.parse(raw) as GitHubConnection;
    return {
      ...emptyConnection(),
      ...parsed,
      syncOptions: { ...DEFAULT_SYNC_OPTIONS, ...(parsed.syncOptions ?? {}) },
      recentSyncs: parsed.recentSyncs ?? [],
    };
  } catch {
    return emptyConnection();
  }
}

function writeState(state: GitHubConnection) {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function emptyConnection(): GitHubConnection {
  return {
    connected: false,
    profile: null,
    repositoryName: null,
    repositoryUrl: null,
    syncOptions: { ...DEFAULT_SYNC_OPTIONS },
    connectedAt: null,
    lastSyncAt: null,
    commitsThisWeek: 0,
    totalCommits: 0,
    recentSyncs: [],
  };
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random()}`;
}

function isThisWeek(ts: number) {
  return Date.now() - ts < 7 * 24 * 60 * 60 * 1000;
}

/* ─── Public API ─────────────────────────────────────────────────────── */

export function getGitHubState(): GitHubConnection {
  return readState();
}

/**
 * Start the GitHub OAuth flow. Opens a popup window for the user to
 * authorize Javify on GitHub. Resolves once the popup signals completion.
 */
export async function connectGitHub(): Promise<GitHubConnection> {
  const base = getApiBaseUrl();
  const token = tokenStore.getAccessToken();
  if (!token) {
    throw new Error("You must be signed in to Javify before connecting GitHub.");
  }

  // Request an OAuth URL from the backend
  const { url } = await apiRequest<{ url: string }>("/auth/github", {
    authToken: token,
  });

  // Open the GitHub authorization URL in a popup
  const popup = window.open(
    url,
    "javify-github-oauth",
    "width=600,height=720,menubar=no,toolbar=no,location=yes"
  );
  if (!popup) {
    throw new Error("Popup blocked. Please allow popups for this site and try again.");
  }

  // Wait for the backend to confirm the OAuth flow has completed
  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", handler);
      reject(new Error("GitHub authorization timed out. Please try again."));
    }, 5 * 60 * 1000);

    function handler(event: MessageEvent) {
      if (!base.startsWith(event.origin) && event.origin !== window.location.origin) return;
      const payload = event.data;
      if (payload && typeof payload === "object" && payload.source === "javify-github-oauth") {
        window.removeEventListener("message", handler);
        window.clearTimeout(timeout);
        if (payload.status === "success") resolve();
        else reject(new Error(payload.error || "GitHub authorization failed."));
      }
    }
    window.addEventListener("message", handler);
  });

  // Pull the real profile + repository from the backend
  return refreshConnection();
}

/**
 * Refresh the cached profile and connection metadata from the backend.
 */
export async function refreshConnection(): Promise<GitHubConnection> {
  const token = tokenStore.getAccessToken() ?? undefined;
  const profile = await apiRequest<GitHubProfile & { repositoryName?: string; repositoryUrl?: string }>(
    "/auth/github/profile",
    { authToken: token }
  );

  const state: GitHubConnection = {
    ...readState(),
    connected: true,
    profile,
    repositoryName: profile.repositoryName ?? DEFAULT_REPO_NAME,
    repositoryUrl: profile.repositoryUrl ?? `${profile.html_url}/${DEFAULT_REPO_NAME}`,
    connectedAt: Date.now(),
  };
  writeState(state);
  return state;
}

export async function disconnectGitHub(): Promise<GitHubConnection> {
  const token = tokenStore.getAccessToken() ?? undefined;
  await apiRequest("/auth/github/disconnect", { method: "POST", authToken: token });
  const fresh = emptyConnection();
  writeState(fresh);
  return fresh;
}

export async function fetchRepositories(): Promise<GitHubRepository[]> {
  const token = tokenStore.getAccessToken() ?? undefined;
  return apiRequest<GitHubRepository[]>("/auth/github/repos", { authToken: token });
}

export function updateSyncOptions(options: Partial<GitHubSyncOptions>): GitHubConnection {
  const state = readState();
  const next: GitHubConnection = {
    ...state,
    syncOptions: { ...state.syncOptions, ...options },
  };
  writeState(next);
  return next;
}

function categoryFolder(category: string) {
  return category.replace(/[^a-zA-Z0-9]+/g, "");
}

function challengeFileName(title: string) {
  const camel = title
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return `${camel}.java`;
}

/**
 * Push a solved challenge as a real GitHub commit via the backend.
 */
export async function pushChallengeProgress(payload: GitHubPushPayload): Promise<GitHubSyncRecord> {
  const state = readState();
  if (!state.connected || !state.syncOptions.autoCommitOnSolve) {
    return {
      id: uid(),
      type: "challenge",
      message: "Skipped — GitHub auto-commit disabled",
      filePath: "",
      timestamp: Date.now(),
      status: "failed",
    };
  }
  const token = tokenStore.getAccessToken() ?? undefined;
  const filePath = `Challenges/${categoryFolder(payload.category)}/${challengeFileName(payload.challengeTitle)}`;
  const message = `Solved ${payload.challengeTitle} | Difficulty: ${payload.difficulty} | +${payload.xpEarned} XP`;

  try {
    const record = await apiRequest<GitHubSyncRecord>("/auth/github/sync-progress", {
      method: "POST",
      body: { ...payload, filePath, message, kind: "challenge" },
      authToken: token,
    });
    registerSync(record);
    return record;
  } catch (error) {
    const failed: GitHubSyncRecord = {
      id: uid(),
      type: "challenge",
      message: error instanceof Error ? error.message : "Push failed",
      filePath,
      timestamp: Date.now(),
      status: "failed",
    };
    registerSync(failed);
    throw error;
  }
}

export function registerSync(record: GitHubSyncRecord) {
  const state = readState();
  state.recentSyncs.unshift(record);
  state.recentSyncs = state.recentSyncs.slice(0, 20);
  if (record.status === "success") {
    state.totalCommits += 1;
  }
  state.commitsThisWeek = state.recentSyncs.filter(
    (r) => r.status === "success" && isThisWeek(r.timestamp)
  ).length;
  state.lastSyncAt = record.timestamp;
  writeState(state);
}

export function buildReadme(input: {
  username: string;
  level: number;
  xp: number;
  streak: number;
  completedCount: number;
  achievements: string[];
  recentSyncs: GitHubSyncRecord[];
  skills: { topic: string; percent: number }[];
}) {
  const ach = input.achievements.length ? input.achievements.map((a) => `- 🏆 ${a}`).join("\n") : "- (none yet)";
  const skills = input.skills.length
    ? input.skills.map((s) => `- **${s.topic}** — ${s.percent}%`).join("\n")
    : "- Start a challenge to see your skill graph appear here.";
  const recent = input.recentSyncs.slice(0, 5).length
    ? input.recentSyncs.slice(0, 5).map((r) => `- ${r.message}`).join("\n")
    : "- No activity yet.";

  return `# Javify Learning Progress

**Username:** ${input.username}
**Level:** ${input.level}
**XP:** ${input.xp}
**Current Streak:** ${input.streak} day(s)
**Challenges Completed:** ${input.completedCount}

## 🏆 Achievements

${ach}

## 📈 Skills Progress

${skills}

## 🛰️ Recent Activity

${recent}

---

_Generated automatically by [Javify](https://javify.dev). Updated ${new Date().toISOString().split("T")[0]}._
`;
}

export async function syncReadme(content: string): Promise<GitHubSyncRecord> {
  const token = tokenStore.getAccessToken() ?? undefined;
  const filePath = "README.md";
  const message = "Update learning progress README";

  try {
    const record = await apiRequest<GitHubSyncRecord>("/auth/github/sync-progress", {
      method: "POST",
      body: { content, filePath, message, kind: "readme" },
      authToken: token,
    });
    registerSync(record);
    return record;
  } catch (error) {
    const failed: GitHubSyncRecord = {
      id: uid(),
      type: "readme",
      message: error instanceof Error ? error.message : "README sync failed",
      filePath,
      timestamp: Date.now(),
      status: "failed",
    };
    registerSync(failed);
    throw error;
  }
}

export async function createPortfolioRepository(): Promise<{ name: string; html_url: string }> {
  const token = tokenStore.getAccessToken() ?? undefined;
  return apiRequest<{ name: string; html_url: string }>("/auth/github/sync-progress", {
    method: "POST",
    body: { kind: "create-repo" },
    authToken: token,
  });
}

export function exportPortfolioMarkdown(input: {
  username: string;
  email: string;
  level: number;
  xp: number;
  coins: number;
  streak: number;
  challenges: { title: string; difficulty: string; xpReward: number }[];
  achievements: { title: string; description: string }[];
  recentSyncs: GitHubSyncRecord[];
}) {
  const downloadable = `# 🎓 ${input.username} — Javify Coding Journey

> Portfolio export generated on ${new Date().toLocaleString()}

## 👤 Profile
- **Username:** ${input.username}
- **Email:** ${input.email}
- **Level:** ${input.level}
- **Total XP:** ${input.xp}
- **Coins:** ${input.coins}
- **Streak:** ${input.streak} day(s)

## ✅ Completed Challenges (${input.challenges.length})
${input.challenges.length === 0 ? "- (none yet)" : input.challenges.map((c) => `- **${c.title}** — ${c.difficulty} • +${c.xpReward} XP`).join("\n")}

## 🏅 Achievements
${input.achievements.length === 0 ? "- (none yet)" : input.achievements.map((a) => `- **${a.title}** — ${a.description}`).join("\n")}

## 📜 GitHub Activity
${input.recentSyncs.slice(0, 10).map((r) => `- ${new Date(r.timestamp).toLocaleString()} — ${r.message}`).join("\n") || "- No GitHub activity yet."}

---

_Built with [Javify](https://javify.dev)._
`;

  const blob = new Blob([downloadable], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${input.username || "javify"}-portfolio.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function buildContributionGrid(syncs: GitHubSyncRecord[]) {
  const days = 84;
  const grid: { date: string; count: number }[] = [];
  const map = new Map<string, number>();
  syncs.forEach((s) => {
    if (s.status !== "success") return;
    const key = new Date(s.timestamp).toISOString().split("T")[0];
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    grid.push({ date: key, count: map.get(key) ?? 0 });
  }
  return grid;
}
