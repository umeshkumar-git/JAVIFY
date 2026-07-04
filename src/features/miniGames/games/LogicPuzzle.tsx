import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../../utils/cn";
import type { GameReward } from "../miniGames.data";
import { LOGIC_PUZZLES } from "../miniGames.data";

interface Props { onComplete: (reward: GameReward, stats: { correct: number; total: number }) => void; onQuit: () => void; }

const ROUNDS = 5;

export default function LogicPuzzle({ onComplete, onQuit }: Props) {
  const [queue] = useState(() => [...LOGIC_PUZZLES].sort(() => Math.random() - 0.5).slice(0, ROUNDS));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);

  const current = queue[currentIdx];
  const isAnswered = selected !== null;
  const isCorrect = selected === current.correctIndex;

  const handleSelect = (i: number) => {
    if (isAnswered) return;
    setSelected(i);
    if (i === current.correctIndex) setCorrect(c => c + 1);
  };

  const handleNext = () => {
    if (currentIdx + 1 >= ROUNDS) {
      setFinished(true);
    } else {
      setCurrentIdx(i => i + 1);
      setSelected(null);
    }
  };

  const handleCollect = () => {
    const xp = 8 * correct + (correct === ROUNDS ? 10 : 0);
    const coins = 3 * correct + (correct === ROUNDS ? 5 : 0);
    onComplete({ xp, coins, badge: correct === ROUNDS ? "Logic Master" : undefined }, { correct, total: ROUNDS });
  };

  if (finished) {
    const pct = Math.round((correct / ROUNDS) * 100);
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border border-violet-400/30 bg-violet-500/10 p-6 text-center">
        <div className="text-4xl mb-2">{pct === 100 ? "🧩✨" : pct >= 60 ? "🧩" : "📚"}</div>
        <div className="text-white font-bold text-xl">
          {pct === 100 ? "Logic Master!" : pct >= 60 ? "Good Thinking!" : "Keep Practicing!"}
        </div>
        <div className="text-slate-300 mt-2">{correct} / {ROUNDS} correct ({pct}%)</div>
        <div className="flex items-center justify-center gap-4 mt-4 text-sm">
          <span className="text-cyan-300">+{8 * correct + (correct === ROUNDS ? 10 : 0)} XP</span>
          <span className="text-amber-300">+{3 * correct + (correct === ROUNDS ? 5 : 0)} coins</span>
          {correct === ROUNDS && <span className="text-violet-300">🏅 Perfect!</span>}
        </div>
        <button type="button" onClick={handleCollect} className="mt-5 btn-3d px-6 py-2 text-sm">Collect Rewards</button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-sm text-slate-300">
          <span>Question <b className="text-white">{currentIdx + 1}/{ROUNDS}</b></span>
          <span className="text-emerald-300">✓ {correct}</span>
          <span className="text-violet-300 text-xs bg-violet-500/10 rounded-full px-2 py-0.5 border border-violet-500/20">{current.topic}</span>
        </div>
        <button type="button" onClick={onQuit} className="text-xs text-slate-500 hover:text-white transition">Quit</button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-white font-medium leading-relaxed">{current.question}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {current.options.map((opt, i) => {
          const isCorrectOpt = i === current.correctIndex;
          const isSelectedOpt = i === selected;
          return (
            <motion.button
              key={i} type="button" whileHover={{ scale: isAnswered ? 1 : 1.01 }} whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect(i)}
              className={cn(
                "rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all",
                isAnswered && isCorrectOpt ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-200" :
                isAnswered && isSelectedOpt && !isCorrect ? "border-rose-400/50 bg-rose-500/20 text-rose-200" :
                isAnswered ? "border-white/5 bg-white/[0.02] text-slate-500 cursor-default" :
                "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:border-cyan-400/30 cursor-pointer"
              )}
            >
              <span className="text-xs text-slate-500 mr-2">{String.fromCharCode(65 + i)}.</span>
              {opt}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {isAnswered && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("rounded-xl border p-4", isCorrect ? "border-emerald-400/30 bg-emerald-500/10" : "border-rose-400/30 bg-rose-500/10")}>
            <div className="text-sm font-bold text-white mb-1">{isCorrect ? "✅ Correct!" : "❌ Wrong!"}</div>
            <p className="text-xs text-slate-300 leading-relaxed">{current.explanation}</p>
            <button type="button" onClick={handleNext} className="mt-3 btn-3d btn-3d-cyan px-5 py-2 text-xs">
              {currentIdx + 1 < ROUNDS ? "Next Question →" : "See Results"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
