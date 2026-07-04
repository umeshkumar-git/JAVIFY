/**
 * GitHub OAuth Integration Routes (REAL OAUTH ONLY)
 *
 * Endpoints:
 *   GET  /auth/github                 - Returns OAuth authorization URL
 *   GET  /auth/github/callback        - GitHub redirect target (handles code exchange)
 *   POST /auth/github/disconnect      - Revokes token + deletes connection
 *   GET  /auth/github/profile         - Returns live GitHub profile + repo metadata
 *   GET  /auth/github/repos           - Returns the user's repositories
 *   POST /auth/github/sync-progress   - Pushes a commit (challenge / readme / create-repo)
 *
 * Tokens are encrypted with AES-256-GCM and never returned to the client.
 */

import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../utils/prisma.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { AppError } from "../middleware/errorHandler.js";
import logger from "../utils/logger.js";
import {
  buildOAuthUrl,
  commitFile,
  decryptToken,
  encryptToken,
  ensurePortfolioRepo,
  exchangeCodeForToken,
  fetchProfile,
  fetchRepositories,
  revokeToken,
  PORTFOLIO_REPO,
} from "../services/github.service.js";

const router = Router();

function requireGitHubConfig() {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.GITHUB_CALLBACK_URL) {
    throw new AppError(
      "GitHub OAuth is not configured on the backend. Set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and GITHUB_CALLBACK_URL.",
      503,
      "GITHUB_NOT_CONFIGURED"
    );
  }
}

/* ─── Start OAuth flow ─────────────────────────────────────────────── */
router.get("/", requireAuth, (req, res, next) => {
  try {
    requireGitHubConfig();
    // State encodes a CSRF nonce + the authenticated user id so the callback
    // can map the GitHub response back to a Javify user.
    const nonce = crypto.randomBytes(12).toString("hex");
    const state = `${nonce}.${req.user.sub}`;
    res.cookie("gh_oauth_state", nonce, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      maxAge: 10 * 60 * 1000,
    });
    res.json({ url: buildOAuthUrl(state) });
  } catch (err) {
    next(err);
  }
});

/* ─── OAuth callback (GitHub redirects here) ───────────────────────── */
router.get("/callback", async (req, res, next) => {
  try {
    requireGitHubConfig();
    const { code, state, error: oauthError, error_description } = req.query;

    if (oauthError) {
      return res.send(renderPostMessage({ status: "error", error: String(error_description || oauthError) }));
    }
    if (!code || !state) {
      return res.send(renderPostMessage({ status: "error", error: "Missing authorization code or state." }));
    }

    const [nonce, userId] = String(state).split(".");
    const cookieNonce = req.cookies?.gh_oauth_state;
    if (!cookieNonce || cookieNonce !== nonce) {
      return res.send(renderPostMessage({ status: "error", error: "OAuth state mismatch. Please try again." }));
    }
    if (!userId) {
      return res.send(renderPostMessage({ status: "error", error: "Invalid state payload." }));
    }

    const accessToken = await exchangeCodeForToken(String(code));
    const profile = await fetchProfile(accessToken);

    await prisma.gitHubConnection.upsert({
      where: { userId },
      update: {
        accessToken: encryptToken(accessToken),
        githubId: profile.id,
        username: profile.login,
        avatarUrl: profile.avatar_url,
        email: profile.email,
        lastSyncAt: new Date(),
      },
      create: {
        userId,
        accessToken: encryptToken(accessToken),
        githubId: profile.id,
        username: profile.login,
        avatarUrl: profile.avatar_url,
        email: profile.email,
        connectedAt: new Date(),
      },
    });

    logger.info("GitHub connected", { userId, githubLogin: profile.login });
    res.clearCookie("gh_oauth_state");
    res.send(renderPostMessage({ status: "success", login: profile.login }));
  } catch (err) {
    logger.error("GitHub OAuth callback failed", { error: err.message });
    res.send(renderPostMessage({ status: "error", error: err.message }));
  }
});

/* ─── Disconnect (revokes token on GitHub + deletes record) ────────── */
router.post("/disconnect", requireAuth, async (req, res, next) => {
  try {
    const conn = await prisma.gitHubConnection.findUnique({ where: { userId: req.user.sub } });
    if (!conn) return res.json({ ok: true });

    try {
      await revokeToken(decryptToken(conn.accessToken));
    } catch (revokeError) {
      logger.warn("GitHub revoke failed (continuing)", { error: revokeError.message });
    }

    await prisma.gitHubConnection.delete({ where: { userId: req.user.sub } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/* ─── Profile (real GitHub data) ──────────────────────────────────── */
router.get("/profile", requireAuth, async (req, res, next) => {
  try {
    const conn = await prisma.gitHubConnection.findUnique({ where: { userId: req.user.sub } });
    if (!conn) throw new AppError("GitHub is not connected.", 404, "GITHUB_NOT_CONNECTED");

    const token = decryptToken(conn.accessToken);
    const profile = await fetchProfile(token).catch((err) => {
      if (err.message.includes("401")) {
        throw new AppError("Your GitHub access has been revoked. Please reconnect.", 401, "GITHUB_TOKEN_REVOKED");
      }
      throw err;
    });

    // Find an existing portfolio repo without creating one (so the panel can show "Pending")
    const repos = await fetchRepositories(token);
    const portfolio = repos.find((r) => r.name === PORTFOLIO_REPO);

    res.json({
      ...profile,
      repositoryName: portfolio?.name ?? null,
      repositoryUrl: portfolio?.html_url ?? null,
    });
  } catch (err) {
    next(err);
  }
});

/* ─── Repositories list ───────────────────────────────────────────── */
router.get("/repos", requireAuth, async (req, res, next) => {
  try {
    const conn = await prisma.gitHubConnection.findUnique({ where: { userId: req.user.sub } });
    if (!conn) throw new AppError("GitHub is not connected.", 404, "GITHUB_NOT_CONNECTED");
    const token = decryptToken(conn.accessToken);
    const repos = await fetchRepositories(token).catch((err) => {
      if (err.message.includes("401")) {
        throw new AppError("Your GitHub access has been revoked. Please reconnect.", 401, "GITHUB_TOKEN_REVOKED");
      }
      throw err;
    });
    res.json(repos);
  } catch (err) {
    next(err);
  }
});

/* ─── Sync progress (challenge / readme / create-repo) ─────────────── */
const syncSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("challenge"),
    challengeId: z.string(),
    challengeTitle: z.string(),
    category: z.string(),
    difficulty: z.string(),
    xpEarned: z.number().int(),
    code: z.string(),
    filePath: z.string(),
    message: z.string(),
  }),
  z.object({
    kind: z.literal("readme"),
    content: z.string(),
    filePath: z.string(),
    message: z.string(),
  }),
  z.object({
    kind: z.literal("create-repo"),
  }),
]);

router.post("/sync-progress", requireAuth, validate(syncSchema), async (req, res, next) => {
  try {
    const conn = await prisma.gitHubConnection.findUnique({ where: { userId: req.user.sub } });
    if (!conn) throw new AppError("GitHub is not connected.", 404, "GITHUB_NOT_CONNECTED");

    const token = decryptToken(conn.accessToken);
    const profile = await fetchProfile(token).catch((err) => {
      if (err.message.includes("401")) {
        throw new AppError("Your GitHub access has been revoked. Please reconnect.", 401, "GITHUB_TOKEN_REVOKED");
      }
      throw err;
    });
    const repo = await ensurePortfolioRepo(token);

    if (req.body.kind === "create-repo") {
      return res.json({ name: repo.name, html_url: repo.html_url });
    }

    const content = req.body.kind === "challenge" ? req.body.code : req.body.content;
    await commitFile(token, {
      owner: profile.login,
      repo: PORTFOLIO_REPO,
      path: req.body.filePath,
      message: req.body.message,
      content,
    });

    await prisma.gitHubConnection.update({
      where: { userId: req.user.sub },
      data: { lastSyncAt: new Date() },
    });

    res.json({
      id: crypto.randomUUID(),
      type: req.body.kind,
      message: req.body.message,
      filePath: req.body.filePath,
      timestamp: Date.now(),
      status: "success",
    });
  } catch (err) {
    next(err);
  }
});

/* ─── HTML response for popup-based OAuth that posts back to opener ── */
function renderPostMessage(payload) {
  const safePayload = JSON.stringify({ source: "javify-github-oauth", ...payload });
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Javify · GitHub</title>
<style>body{font-family:Inter,sans-serif;display:grid;place-items:center;height:100vh;margin:0;background:#0b1020;color:#fff;text-align:center;padding:24px}</style>
</head>
<body>
  <div>
    <h2 style="margin:0 0 8px">Connecting to Javify…</h2>
    <p style="opacity:.7;margin:0">You can close this window if it doesn't close automatically.</p>
  </div>
  <script>
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(${safePayload}, "*");
      }
    } catch (e) {}
    setTimeout(function () { window.close(); }, 800);
  </script>
</body></html>`;
}

export default router;
