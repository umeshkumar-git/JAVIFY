import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { analyzeCode, type AiAnalysisResult, type AiAnalysisType } from "./aiMentor.service";
import { cn } from "../../utils/cn";

interface AiMentorPanelProps {
  code: string;
  challengeId?: string;
  className?: string;
}

const TABS: { key: AiAnalysisType; label: string; icon: string }[] = [
  { key: "hint", label: "Hint", icon: "💡" },
  { key: "explanation", label: "Explanation", icon: "📖" },
  { key: "improve", label: "Improve Code", icon: "✨" },
  { key: "suggestion", label: "Learning", icon: "🎯" },
];

export default function AiMentorPanel({ code, challengeId, className }: AiMentorPanelProps) {
  const [activeTab, setActiveTab] = useState<AiAnalysisType>("hint");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async (type: AiAnalysisType) => {
    setActiveTab(type);
    setLoading(true);
    setError(null);
    try {
      const analysis = await analyzeCode(code, challengeId, type);
      setResult(analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
          <p className="text-xs text-slate-400">AI Mentor analyzing your code…</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      );
    }

    if (!result) {
      return (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🤖</div>
          <p className="text-sm text-slate-400">
            Select a tab above to get AI-powered insights on your code.
          </p>
        </div>
      );
    }

    if (activeTab === "hint") {
      return (
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">💡</span>
            <p className="text-sm leading-relaxed text-cyan-100 whitespace-pre-wrap">{result.hint}</p>
          </div>
        </div>
      );
    }

    if (activeTab === "explanation") {
      return (
        <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
          <p className="text-sm leading-relaxed text-violet-100 whitespace-pre-wrap">
            {result.explanation}
          </p>
        </div>
      );
    }

    if (activeTab === "improve") {
      return (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 overflow-hidden">
          <div className="border-b border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
            Suggested Improvement
          </div>
          <pre className="p-4 text-xs leading-relaxed text-emerald-100 font-mono overflow-x-auto whitespace-pre-wrap">
            {result.improvement}
          </pre>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {result.suggestions.map((s, i) => (
          <div
            key={i}
            className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 flex items-start gap-3"
          >
            <span className="text-amber-300 font-bold text-sm">{i + 1}.</span>
            <p className="text-sm text-amber-100">{s}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "glass-panel rounded-[24px] border border-white/10 overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/8 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
        <div className="flex items-center gap-2.5">
          <div className="relative h-7 w-7 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
            <span className="text-[10px] font-black text-white">AI</span>
            <span className="absolute -bottom-px -right-px h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[#0b1020]" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white leading-none">AI Coding Mentor</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Personalized Java insights</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-2 border-b border-white/5 bg-white/[0.02] overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => runAnalysis(tab.key)}
            className={cn(
              "shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition",
              activeTab === tab.key
                ? "bg-white/12 text-white"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            )}
          >
            <span className="text-sm">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 min-h-[180px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + String(loading)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
