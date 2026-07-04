import { motion } from "framer-motion";
import { cn } from "../../utils/cn";

export interface TestCaseResult {
  ok: boolean;
  hidden?: boolean;
  executionTime?: number;
  memoryUsage?: number;
  diff?: { expected: string; actual: string } | null;
}

export interface JudgeResultsData {
  result: "PASSED" | "FAILED" | "PARTIAL" | "TIMEOUT" | "COMPILE_ERROR" | "RUNTIME_ERROR";
  score: number;
  passedTests: number;
  totalTests: number;
  executionTime: number;
  memoryUsage: number;
  details: TestCaseResult[];
}

const RESULT_STYLES: Record<JudgeResultsData["result"], { color: string; label: string; icon: string }> = {
  PASSED: { color: "from-emerald-500 to-cyan-500", label: "All Tests Passed", icon: "✓" },
  FAILED: { color: "from-rose-500 to-pink-500", label: "Tests Failed", icon: "✗" },
  PARTIAL: { color: "from-amber-500 to-orange-500", label: "Partial Pass", icon: "◐" },
  TIMEOUT: { color: "from-orange-500 to-red-500", label: "Time Limit Exceeded", icon: "⏱" },
  COMPILE_ERROR: { color: "from-rose-500 to-fuchsia-500", label: "Compilation Error", icon: "⚠" },
  RUNTIME_ERROR: { color: "from-fuchsia-500 to-rose-500", label: "Runtime Error", icon: "💥" },
};

interface JudgeResultsProps {
  data: JudgeResultsData;
  className?: string;
}

export default function JudgeResults({ data, className }: JudgeResultsProps) {
  const style = RESULT_STYLES[data.result];

  return (
    <div className={cn("glass-panel rounded-[24px] border border-white/10 overflow-hidden", className)}>
      {/* Header */}
      <div
        className={cn(
          "px-5 py-4 bg-gradient-to-r border-b border-white/10 relative overflow-hidden",
          style.color
        )}
      >
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{style.icon}</span>
            <div>
              <div className="text-sm font-bold text-white">{style.label}</div>
              <div className="text-[10px] uppercase tracking-widest text-white/70">
                Judge Report
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-white drop-shadow-lg">{data.score}%</div>
            <div className="text-[10px] uppercase tracking-widest text-white/80">Score</div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-black/5 dark:bg-white/5">
        <Metric label="Passed" value={`${data.passedTests}/${data.totalTests}`} accent="text-emerald-600 dark:text-emerald-300" />
        <Metric label="Failed" value={String(data.totalTests - data.passedTests)} accent="text-rose-600 dark:text-rose-300" />
        <Metric label="Exec Time" value={`${data.executionTime}ms`} accent="text-cyan-600 dark:text-cyan-300" />
        <Metric label="Memory" value={data.memoryUsage ? `${data.memoryUsage}KB` : "—"} accent="text-violet-600 dark:text-violet-300" />
      </div>

      {/* Progress Bar */}
      <div className="px-5 py-3 border-b border-gray-100 dark:border-white/5">
        <div className="h-2 rounded-full bg-gray-100 dark:bg-white/8 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${data.score}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={cn("h-full rounded-full bg-gradient-to-r", style.color)}
          />
        </div>
      </div>

      {/* Test Cases */}
      <div className="p-4 space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
        {data.details.map((detail, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm",
              detail.ok
                ? "border-emerald-400/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-200"
                : "border-rose-400/30 bg-rose-500/5 text-rose-700 dark:text-rose-200"
            )}
          >
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-sm",
                detail.ok ? "bg-emerald-500" : "bg-rose-500"
              )}
            >
              {detail.ok ? "✓" : "✗"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-900 dark:text-white">
                Test #{i + 1} {detail.hidden ? "(hidden)" : ""}
              </div>
              {detail.diff && !detail.ok && (
                <div className="mt-1 text-[10px] text-rose-800 dark:text-rose-300/80 font-mono truncate">
                  expected:{" "}
                  <span className="text-emerald-700 dark:text-emerald-300">{detail.diff.expected.slice(0, 40)}</span>
                  {" · got: "}
                  <span className="text-rose-700 dark:text-rose-300">{detail.diff.actual.slice(0, 40)}</span>
                </div>
              )}
            </div>
            <div className="text-[10px] text-gray-500 dark:text-slate-500 shrink-0">
              {detail.executionTime ? `${detail.executionTime}ms` : ""}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="p-3 bg-white/5 dark:bg-[#0b1020]/60">
      <div className={cn("text-lg font-bold", accent)}>{value}</div>
      <div className="text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}
