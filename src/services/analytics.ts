/**
 * Javify Analytics Engine
 * Automatic tracking of visits, sessions, users, pages, and activity
 */

/* ── Data Shapes ── */

interface VisitEntry {
  id: string;
  visitorId: string;
  sessionId: string;
  path: string;
  timestamp: number;
  screen: string;
  language: string;
  referrer: string;
}

interface SessionEntry {
  sessionId: string;
  visitorId: string;
  startedAt: number;
  lastActiveAt: number;
  pageCount: number;
}

interface UserActivity {
  userId: string;
  action: string;
  details: string;
  timestamp: number;
}

export interface AnalyticsSnapshot {
  totalPageViews: number;
  uniqueVisitors: number;
  totalSessions: number;
  visitsToday: number;
  visitsThisWeek: number;
  activeNow: number;
  bounceRate: string;
  avgPagesPerSession: string;
  growthRate: string;
  topPages: { path: string; count: number; label: string }[];
  dailyVisits: { date: string; count: number }[];
  hourlyToday: { hour: string; count: number }[];
  recentVisitors: { visitorId: string; path: string; timestamp: number; screen: string }[];
  activityLog: UserActivity[];
  deviceBreakdown: { label: string; count: number; percent: string }[];
}

/* ── Storage Keys ── */

const VISITS_KEY = "javify-analytics-visits";
const SESSIONS_KEY = "javify-analytics-sessions";
const ACTIVITY_KEY = "javify-analytics-activity";
const VISITOR_KEY = "javify-analytics-vid";
const SESSION_KEY = "javify-analytics-sid";
const SESSION_TS_KEY = "javify-analytics-sts";
const MAX_ENTRIES = 2000;
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 min

/* ── Helpers ── */

function uid(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readJson<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeJson<T>(key: string, data: T[], max = MAX_ENTRIES) {
  localStorage.setItem(key, JSON.stringify(data.slice(-max)));
}

function getVisitorId(): string {
  let vid = localStorage.getItem(VISITOR_KEY);
  if (!vid) {
    vid = uid();
    localStorage.setItem(VISITOR_KEY, vid);
  }
  return vid;
}

function getSessionId(): string {
  const now = Date.now();
  const lastActive = Number(localStorage.getItem(SESSION_TS_KEY) || "0");
  let sid = localStorage.getItem(SESSION_KEY);

  if (!sid || now - lastActive > SESSION_TIMEOUT) {
    sid = uid();
    localStorage.setItem(SESSION_KEY, sid);

    // Record new session
    const sessions = readJson<SessionEntry>(SESSIONS_KEY);
    sessions.push({
      sessionId: sid,
      visitorId: getVisitorId(),
      startedAt: now,
      lastActiveAt: now,
      pageCount: 0,
    });
    writeJson(SESSIONS_KEY, sessions);
  }

  localStorage.setItem(SESSION_TS_KEY, String(now));
  return sid;
}

function updateSession(sessionId: string) {
  const sessions = readJson<SessionEntry>(SESSIONS_KEY);
  const idx = sessions.findIndex((s) => s.sessionId === sessionId);
  if (idx >= 0) {
    sessions[idx].lastActiveAt = Date.now();
    sessions[idx].pageCount += 1;
    writeJson(SESSIONS_KEY, sessions);
  }
}

function detectDevice(): string {
  const ua = navigator.userAgent;
  if (/Mobile|Android|iPhone|iPad/i.test(ua)) return "Mobile";
  if (/Tablet|iPad/i.test(ua)) return "Tablet";
  return "Desktop";
}

function isToday(ts: number): boolean {
  const d = new Date(ts);
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

function isThisWeek(ts: number): boolean {
  return ts > Date.now() - 7 * 24 * 60 * 60 * 1000;
}

function formatDateKey(ts: number): string {
  return new Date(ts).toISOString().split("T")[0];
}

const PAGE_LABELS: Record<string, string> = {
  "/": "Landing Page",
  "/dashboard": "Dashboard",
  "/map": "World Map",
  "/architecture": "Architecture",
  "/admin": "Admin Panel",
  "/user": "User Profile",
  "/auth": "Login / Register",
  "/preview": "Preview Tour",
};

/* ── Public API ── */

export function recordVisit(path: string) {
  const visitorId = getVisitorId();
  const sessionId = getSessionId();

  const visits = readJson<VisitEntry>(VISITS_KEY);
  visits.push({
    id: uid(),
    visitorId,
    sessionId,
    path,
    timestamp: Date.now(),
    screen: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language,
    referrer: document.referrer,
  });
  writeJson(VISITS_KEY, visits);
  updateSession(sessionId);
}

export function recordActivity(userId: string, action: string, details: string) {
  const activities = readJson<UserActivity>(ACTIVITY_KEY);
  activities.push({ userId, action, details, timestamp: Date.now() });
  writeJson(ACTIVITY_KEY, activities, 500);
}

export function getAnalytics(): AnalyticsSnapshot {
  const visits = readJson<VisitEntry>(VISITS_KEY);
  const sessions = readJson<SessionEntry>(SESSIONS_KEY);
  const activities = readJson<UserActivity>(ACTIVITY_KEY);
  const now = Date.now();

  // Unique visitors
  const uniqueVisitors = new Set(visits.map((v) => v.visitorId)).size;

  // Time-based counts
  const visitsToday = visits.filter((v) => isToday(v.timestamp)).length;
  const visitsThisWeek = visits.filter((v) => isThisWeek(v.timestamp)).length;

  // Active now (visited in last 5 minutes)
  const activeNow = new Set(visits.filter((v) => now - v.timestamp < 5 * 60 * 1000).map((v) => v.visitorId)).size;

  // Bounce rate (sessions with only 1 page view)
  const completedSessions = sessions.filter((s) => s.pageCount > 0);
  const bounceSessions = completedSessions.filter((s) => s.pageCount === 1);
  const bounceRate = completedSessions.length > 0
    ? `${Math.round((bounceSessions.length / completedSessions.length) * 100)}%`
    : "0%";

  // Avg pages per session
  const totalPagesInSessions = completedSessions.reduce((sum, s) => sum + s.pageCount, 0);
  const avgPagesPerSession = completedSessions.length > 0
    ? (totalPagesInSessions / completedSessions.length).toFixed(1)
    : "0";

  // Growth rate (this week vs previous week)
  const prevWeekCount = visits.filter((v) => v.timestamp > now - 14 * 24 * 60 * 60 * 1000 && !isThisWeek(v.timestamp)).length;
  const growthRate = prevWeekCount === 0
    ? visitsThisWeek > 0 ? "+100%" : "0%"
    : `${visitsThisWeek >= prevWeekCount ? "+" : ""}${Math.round(((visitsThisWeek - prevWeekCount) / prevWeekCount) * 100)}%`;

  // Top pages
  const pageMap: Record<string, number> = {};
  visits.forEach((v) => { pageMap[v.path] = (pageMap[v.path] || 0) + 1; });
  const topPages = Object.entries(pageMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([path, count]) => ({
      path,
      count,
      label: path.startsWith("/challenge/") ? "Coding Challenge" : (PAGE_LABELS[path] || path),
    }));

  // Daily visits (last 14 days)
  const dailyMap: Record<string, number> = {};
  visits.forEach((v) => {
    const key = formatDateKey(v.timestamp);
    dailyMap[key] = (dailyMap[key] || 0) + 1;
  });
  const dailyVisits = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i));
    const key = d.toISOString().split("T")[0];
    return { date: key, count: dailyMap[key] || 0 };
  });

  // Hourly breakdown for today
  const hourlyMap: Record<number, number> = {};
  visits.filter((v) => isToday(v.timestamp)).forEach((v) => {
    const h = new Date(v.timestamp).getHours();
    hourlyMap[h] = (hourlyMap[h] || 0) + 1;
  });
  const hourlyToday = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h.toString().padStart(2, "0")}:00`,
    count: hourlyMap[h] || 0,
  }));

  // Recent visitors (last 20 unique)
  const seenVisitors = new Set<string>();
  const recentVisitors: AnalyticsSnapshot["recentVisitors"] = [];
  for (let i = visits.length - 1; i >= 0 && recentVisitors.length < 20; i--) {
    const v = visits[i];
    if (!seenVisitors.has(v.visitorId)) {
      seenVisitors.add(v.visitorId);
      recentVisitors.push({ visitorId: v.visitorId, path: v.path, timestamp: v.timestamp, screen: v.screen });
    }
  }

  // Device breakdown
  const deviceMap: Record<string, number> = {};
  visits.forEach((v) => {
    const device = /Mobile|Android|iPhone/i.test(v.screen && v.screen.includes("x") ? "" : "") ? "Unknown" : detectDevice();
    deviceMap[device] = (deviceMap[device] || 0) + 1;
  });
  // Simple screen-width-based detection from stored data
  const mobileCount = visits.filter((v) => { const w = parseInt(v.screen); return w > 0 && w <= 768; }).length;
  const tabletCount = visits.filter((v) => { const w = parseInt(v.screen); return w > 768 && w <= 1024; }).length;
  const desktopCount = visits.length - mobileCount - tabletCount;
  const total = visits.length || 1;
  const deviceBreakdown = [
    { label: "Desktop", count: desktopCount, percent: `${Math.round((desktopCount / total) * 100)}%` },
    { label: "Mobile", count: mobileCount, percent: `${Math.round((mobileCount / total) * 100)}%` },
    { label: "Tablet", count: tabletCount, percent: `${Math.round((tabletCount / total) * 100)}%` },
  ];

  return {
    totalPageViews: visits.length,
    uniqueVisitors,
    totalSessions: sessions.length,
    visitsToday,
    visitsThisWeek,
    activeNow,
    bounceRate,
    avgPagesPerSession,
    growthRate,
    topPages,
    dailyVisits,
    hourlyToday,
    recentVisitors,
    activityLog: activities.slice(-50).reverse(),
    deviceBreakdown,
  };
}

export function clearAnalytics() {
  localStorage.removeItem(VISITS_KEY);
  localStorage.removeItem(SESSIONS_KEY);
  localStorage.removeItem(ACTIVITY_KEY);
}
