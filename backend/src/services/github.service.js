/**
 * GitHub Integration Service
 *
 * Handles OAuth, encrypted token storage, repository management, and
 * GitHub API calls on behalf of the user. Tokens are never exposed to
 * the frontend.
 *
 * Required env vars:
 *   GITHUB_CLIENT_ID
 *   GITHUB_CLIENT_SECRET
 *   GITHUB_OAUTH_REDIRECT
 *   GITHUB_TOKEN_ENCRYPTION_KEY  (32-byte base64)
 */

import crypto from "crypto";
import { env } from "../config/env.js";
import logger from "../utils/logger.js";

const GITHUB_API = "https://api.github.com";
const PORTFOLIO_REPO = "Javify-Learning-Progress";

/* ─── Token encryption (AES-256-GCM) ───────────────────────────────── */
function getEncryptionKey() {
  if (!env.GITHUB_TOKEN_ENCRYPTION_KEY) {
    throw new Error("GITHUB_TOKEN_ENCRYPTION_KEY not configured");
  }
  return Buffer.from(env.GITHUB_TOKEN_ENCRYPTION_KEY, "base64");
}

export function encryptToken(token) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptToken(payload) {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

/* ─── OAuth flow ───────────────────────────────────────────────────── */
export function buildOAuthUrl(state) {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  url.searchParams.set("redirect_uri", env.GITHUB_CALLBACK_URL);
  url.searchParams.set("scope", "repo read:user user:email");
  url.searchParams.set("state", state);
  url.searchParams.set("allow_signup", "true");
  return url.toString();
}

export async function exchangeCodeForToken(code) {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: env.GITHUB_CALLBACK_URL,
    }),
  });
  if (!response.ok) throw new Error(`GitHub token exchange failed: ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(data.error_description || data.error);
  if (!data.access_token) throw new Error("GitHub did not return an access token");
  return data.access_token;
}

/* ─── GitHub API helpers ───────────────────────────────────────────── */
async function gh(endpoint, token, options = {}) {
  const response = await fetch(`${GITHUB_API}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub ${endpoint} failed: ${response.status} ${body}`);
  }
  return response.json();
}

export async function fetchProfile(token) {
  return gh("/user", token);
}

export async function fetchRepositories(token) {
  return gh("/user/repos?per_page=30&sort=updated", token);
}

export async function ensurePortfolioRepo(token, options = {}) {
  const repos = await fetchRepositories(token);
  const existing = repos.find((r) => r.name === PORTFOLIO_REPO);
  if (existing) return existing;

  return gh("/user/repos", token, {
    method: "POST",
    body: JSON.stringify({
      name: PORTFOLIO_REPO,
      description: "My Java learning journey on Javify ☕",
      private: options.private ?? false,
      auto_init: true,
    }),
  });
}

export async function commitFile(token, { owner, repo, path, message, content }) {
  let sha;
  try {
    const existing = await gh(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, token);
    sha = existing.sha;
  } catch {
    sha = undefined;
  }
  return gh(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, token, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: Buffer.from(content, "utf8").toString("base64"),
      sha,
    }),
  });
}

export async function revokeToken(token) {
  try {
    const basic = Buffer.from(`${env.GITHUB_CLIENT_ID}:${env.GITHUB_CLIENT_SECRET}`).toString("base64");
    await fetch(`https://api.github.com/applications/${env.GITHUB_CLIENT_ID}/token`, {
      method: "DELETE",
      headers: { Authorization: `Basic ${basic}`, Accept: "application/vnd.github+json" },
      body: JSON.stringify({ access_token: token }),
    });
  } catch (error) {
    logger.warn("GitHub token revoke failed", { error: error.message });
  }
}

export { PORTFOLIO_REPO };
