import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { type AnalyticsSnapshot, getAnalytics, clearAnalytics } from "../services/analytics";
import { useJavifyStore } from "../store/useJavifyStore";
import { cn } from "../utils/cn";

function GlassPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("glass-panel rounded-[28px] border border-white/10", className)}>{children}</div>;
}

function StatCard({ label, value, sub, accent, icon }: { label: string; value: string | number; sub: string; accent: string; icon: string }) {
  return (
    <GlassPanel className="relative overflow-hidden p-5">
      <div className={cn("absolute inset-x-6 top-0 h-24 rounded-full blur-3xl opacity-50", accent)} />
      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <p className="text-xs uppercase tracking-[0.32em] text-slate-400">{label}</p>
        </div>
        <div className="mt-3 text-3xl font-bold text-white">{value}</div>
        <p className="mt-2 text-sm text-slate-300">{sub}</p>
      </div>
    </GlassPanel>
  );
}

function BarChart({ data, labelKey, valueKey }: { data: { [k: string]: unknown }[]; labelKey: string; valueKey: string }) {
  const values = data.map((d) => Number(d[valueKey]) || 0);
  const maxVal = Math.max(...values, 1);

  return (
    <div className="flex items-end justify-between gap-1.5 h-44">
      {data.map((item, i) => {
        const val = Number(item[valueKey]) || 0;
        const height = Math.max((val / maxVal) * 100, 3);
        const rawLabel = String(item[labelKey]);
        const short = rawLabel.length > 5 ? rawLabel.slice(5) : rawLabel;

        return (
          <div key={i} className="flex flex-col items-center flex-1 min-w-0">
            <span className="text-[9px] text-slate-500 mb-1 truncate">{val || ""}</span>
            <div className="w-full flex items-end justify-center" style={{ height: "100%" }}>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ duration: 0.5, delay: i * 0.03 }}
                className="w-full max-w-[28px] rounded-t-md bg-gradient-to-t from-cyan-500 to-violet-500"
              />
            </div>
            <span className="text-[9px] text-slate-500 mt-1.5 truncate w-full text-center">{short}</span>
          </div>
        );
      })}
    </div>
  );
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const username = useJavifyStore((s) => s.username);
  const role = useJavifyStore((s) => s.role);
  const [tab, setTab] = useState<"overview" | "pages" | "visitors" | "activity">("overview");

  useEffect(() => { /* tracked globally */ }, []);

  const { data, refetch } = useQuery<AnalyticsSnapshot>({
    queryKey: ["admin-analytics"],
    queryFn: () => new Promise<AnalyticsSnapshot>((res) => setTimeout(() => res(getAnalytics()), 200)),
    refetchInterval: 4000,
  });

  if (role !== "admin") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
        <GlassPanel className="p-8 max-w-md">
          <div className="text-5xl">🔒</div>
          <h2 className="mt-4 text-2xl font-bold text-white">Admin Access Required</h2>
          <p className="mt-3 text-sm text-slate-300">Log in with an email containing "admin" to access this panel.</p>
          <button type="button" onClick={() => navigate("/dashboard")} className="btn-3d mt-6 px-6 py-3 text-sm">
            Back to Dashboard
          </button>
        </GlassPanel>
      </div>
    );
  }

  const d = data;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 text-lg font-black text-white shadow-lg">A</div>
            <div>
              <p className="text-xs uppercase tracking-[0.34em] text-violet-600 dark:text-violet-300">Admin Panel</p>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">Analytics & Visitors</h1>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">Real-time usage data for Javify — Welcome, <span className="text-gray-900 dark:text-white">{username}</span></p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/user" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 hover:bg-white/10 transition">User Panel</Link>
          <button type="button" onClick={() => { clearAnalytics(); refetch(); }} className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300 hover:bg-rose-500/15 transition">
            Reset Data
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-1 text-xs sm:text-sm">
        {(["overview", "pages", "visitors", "activity"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn("flex-1 rounded-xl px-3 py-2 capitalize transition", tab === t ? "bg-white/10 dark:bg-white/12 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white")}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ═══ OVERVIEW TAB ═══ */}
      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon="📊" label="Total Visitors" value={d?.totalPageViews ?? 0} sub="All-time platform views" accent="bg-cyan-400/20" />
            <StatCard icon="👥" label="Visitor Count" value={d?.uniqueVisitors ?? 0} sub={`${d?.totalSessions ?? 0} unique operatives`} accent="bg-violet-500/20" />
            <StatCard icon="📅" label="Today's Visits" value={d?.visitsToday ?? 0} sub={`Growth: ${d?.growthRate ?? "—"}`} accent="bg-fuchsia-500/20" />
            <StatCard icon="⚡" label="User Visiting Count" value={d?.activeNow ?? 0} sub="Operatives active now" accent="bg-emerald-400/20" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <GlassPanel className="p-5">
              <h3 className="text-sm font-semibold text-white mb-1">Daily Traffic (14 days)</h3>
              <p className="text-xs text-slate-500 mb-4">Page views per day</p>
              {d?.dailyVisits ? (
                <BarChart data={d.dailyVisits} labelKey="date" valueKey="count" />
              ) : <div className="h-44 flex items-center justify-center text-slate-600 text-sm">Loading...</div>}
            </GlassPanel>

            <GlassPanel className="p-5">
              <h3 className="text-sm font-semibold text-white mb-1">Hourly Today</h3>
              <p className="text-xs text-slate-500 mb-4">Traffic distribution by hour</p>
              {d?.hourlyToday ? (
                <BarChart data={d.hourlyToday} labelKey="hour" valueKey="count" />
              ) : <div className="h-44 flex items-center justify-center text-slate-600 text-sm">Loading...</div>}
            </GlassPanel>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_0.6fr]">
            <GlassPanel className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Session Quality</h3>
              <p className="text-xs text-gray-500 dark:text-slate-500 mb-4">Engagement metrics</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-gray-200 dark:border-white/8 bg-gray-50 dark:bg-white/5 p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{d?.avgPagesPerSession ?? "—"}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-widest text-gray-500 dark:text-slate-400">Pages / Session</div>
                </div>
                <div className="rounded-2xl border border-gray-200 dark:border-white/8 bg-gray-50 dark:bg-white/5 p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{d?.bounceRate ?? "—"}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-widest text-gray-500 dark:text-slate-400">Bounce Rate</div>
                </div>
                <div className="rounded-2xl border border-gray-200 dark:border-white/8 bg-gray-50 dark:bg-white/5 p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{d?.visitsThisWeek ?? 0}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-widest text-gray-500 dark:text-slate-400">This Week</div>
                </div>
              </div>
            </GlassPanel>

            <GlassPanel className="p-5">
              <h3 className="text-sm font-semibold text-white mb-1">Devices</h3>
              <p className="text-xs text-slate-500 mb-4">Visitor device types</p>
              <div className="space-y-3">
                {(d?.deviceBreakdown ?? []).map((dev) => (
                  <div key={dev.label} className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">{dev.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500" style={{ width: dev.percent }} />
                      </div>
                      <span className="text-xs text-slate-400 w-10 text-right">{dev.percent}</span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassPanel>
          </div>
        </div>
      )}

      {/* ═══ PAGES TAB ═══ */}
      {tab === "pages" && (
        <GlassPanel className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Page Performance</h3>
          <p className="text-xs text-gray-500 dark:text-slate-500 mb-5">All tracked pages ranked by views</p>
          <div className="space-y-4">
            {(d?.topPages ?? []).length > 0 ? d!.topPages.map((page, i) => {
              const maxC = d!.topPages[0].count || 1;
              const w = Math.max((page.count / maxC) * 100, 4);
              return (
                <div key={page.path} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gray-200 dark:bg-white/10 text-[10px] font-bold text-gray-700 dark:text-white">{i + 1}</span>
                      <span className="text-gray-700 dark:text-slate-200">{page.label}</span>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500">{page.path}</span>
                    </div>
                    <span className="text-gray-900 dark:text-white font-semibold">{page.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${w}%` }} transition={{ duration: 0.6, delay: i * 0.05 }} className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500" />
                  </div>
                </div>
              );
            }) : (
              <div className="text-center text-slate-500 py-8">No page data yet. Browse the site to generate analytics.</div>
            )}
          </div>
        </GlassPanel>
      )}

      {/* ═══ VISITORS TAB ═══ */}
      {tab === "visitors" && (
        <GlassPanel className="p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Recent Visitors</h3>
          <p className="text-xs text-slate-500 mb-5">{d?.uniqueVisitors ?? 0} unique visitors tracked</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/8 text-xs uppercase tracking-wider text-slate-500">
                  <th className="py-3 pr-4">Visitor</th>
                  <th className="py-3 pr-4">Last Page</th>
                  <th className="py-3 pr-4">Screen</th>
                  <th className="py-3">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {(d?.recentVisitors ?? []).map((v, i) => (
                  <tr key={i} className="text-gray-700 dark:text-slate-300">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600/20 text-[10px] font-bold text-violet-600 dark:text-violet-300">
                          {v.visitorId.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-slate-400 font-mono">{v.visitorId.slice(0, 8)}...</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-xs">{PAGE_LABEL(v.path)}</td>
                    <td className="py-3 pr-4 text-xs text-gray-400 dark:text-slate-500">{v.screen}</td>
                    <td className="py-3 text-xs text-gray-400 dark:text-slate-500">{timeAgo(v.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(d?.recentVisitors ?? []).length === 0 && (
              <div className="text-center text-slate-500 py-8">No visitors tracked yet.</div>
            )}
          </div>
        </GlassPanel>
      )}

      {/* ═══ ACTIVITY TAB ═══ */}
      {tab === "activity" && (
        <GlassPanel className="p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Activity Feed</h3>
          <p className="text-xs text-slate-500 mb-5">User actions across the platform</p>
          <div className="space-y-3">
            {(d?.activityLog ?? []).length > 0 ? d!.activityLog.map((item, i) => (
              <div key={i} className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600/20 text-xs font-bold text-violet-300">
                  {item.userId.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{item.userId}</span>
                    <span className="rounded-full bg-cyan-100 dark:bg-cyan-400/10 border border-cyan-200 dark:border-cyan-400/20 px-2 py-0.5 text-[10px] text-cyan-700 dark:text-cyan-300">{item.action}</span>
                    <span className="text-[10px] text-gray-500 dark:text-slate-500">{timeAgo(item.timestamp)}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-600 dark:text-slate-400">{item.details}</p>
                </div>
              </div>
            )) : (
              <div className="text-center text-slate-500 py-8">No activity recorded yet.</div>
            )}
          </div>
        </GlassPanel>
      )}

      {/* Platform Status */}
      <GlassPanel className="p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Platform Status</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Java Compiler", status: "Operational" },
            { label: "Auth System", status: "Operational" },
            { label: "Analytics Engine", status: "Recording" },
            { label: "AI Assistant", status: "Operational" },
          ].map((svc) => (
            <div key={svc.label} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
              <div>
                <div className="text-xs font-medium text-white">{svc.label}</div>
                <div className="text-[10px] text-slate-500">{svc.status}</div>
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}

function PAGE_LABEL(path: string): string {
  const map: Record<string, string> = {
    "/": "Landing", "/dashboard": "Dashboard", "/map": "World Map", "/admin": "Admin",
    "/user": "Profile", "/architecture": "Architecture", "/preview": "Preview",
  };
  if (path.startsWith("/challenge/")) return "Challenge";
  return map[path] || path;
}
