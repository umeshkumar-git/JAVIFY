/**
 * GitHub Integration Types
 * Shared types for the Javify ↔ GitHub bridge.
 */

export interface GitHubProfile {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  company: string | null;
  location: string | null;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
}

export interface GitHubSyncOptions {
  autoCommitOnSolve: boolean;
  pushAchievements: boolean;
  pushAnalytics: boolean;
  pushLearningProgress: boolean;
  pushDailySummaries: boolean;
  privateRepository: boolean;
}

export interface GitHubConnection {
  connected: boolean;
  profile: GitHubProfile | null;
  repositoryName: string | null;
  repositoryUrl: string | null;
  syncOptions: GitHubSyncOptions;
  connectedAt: number | null;
  lastSyncAt: number | null;
  commitsThisWeek: number;
  totalCommits: number;
  recentSyncs: GitHubSyncRecord[];
}

export interface GitHubSyncRecord {
  id: string;
  type: "challenge" | "achievement" | "readme" | "manual";
  message: string;
  filePath: string;
  timestamp: number;
  status: "success" | "pending" | "failed";
}

export interface GitHubPushPayload {
  challengeId: string;
  challengeTitle: string;
  category: string;
  difficulty: string;
  xpEarned: number;
  code: string;
  executionTime?: number;
  passedTests?: number;
  totalTests?: number;
}

export const DEFAULT_SYNC_OPTIONS: GitHubSyncOptions = {
  autoCommitOnSolve: true,
  pushAchievements: true,
  pushAnalytics: false,
  pushLearningProgress: true,
  pushDailySummaries: false,
  privateRepository: false,
};

export const DEFAULT_REPO_NAME = "Javify-Learning-Progress";
