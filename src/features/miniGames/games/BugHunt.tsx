import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../../utils/cn";
import type { GameReward } from "../miniGames.data";
import { BUG_SNIPPETS } from "../miniGames.data";

interface Props { onComplete: (reward: GameReward, stats: { bugsFixed: number; timeSeconds: number }) => void; onQuit: () => void; }

const ROUNDS = 3;
const TIME_PER_ROUND = 45;

export default function BugHunt({ onComplete, onQuit }: Props) {
  const [queue] = useState(() => [...BUG_SNIPPETS].sort(() => Math.random() - 0.5).slice(0, ROUNDS));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_ROUND);
  const [finished, setFinished] = useState(false);
  const [startTime] = useState(Date.now());

  const current = queue[currentIdx];

  useEffect(() => {
    if (revealed || finished) return;
    if (timeLeft <= 0) { handleReveal(null); return; }
    const t = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, revealed, finished]);

  const handleReveal = (lineIndex: number | null) => {
    setSelected(lineIndex);
    setRevealed(true);
    if (lineIndex === current.errorLine - 1) setCorrect(c => c + 1);
  };

  const handleNext = () => {
    if (currentIdx + 1 >= ROUNDS) {
      setFinished(true);
    } else {
      setCurrentIdx(i => i + 1);
      setSelected(null);
      setRevealed(false);
      setTimeLeft(TIME_PER_ROUND);
    }
  };

  const handleCollect = () => {
    const seconds = Math.round((Date.now() - startTime) / 1000);
    onComplete({ xp: 10 * correct, coins: 5 * correct, badge: correct === ROUNDS ? "Bug Expert" : undefined }, { bugsFixed: correct, timeSeconds: seconds });
  };

  if (finished) {
    const perfect = correct === ROUNDS;
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border border-violet-400/30 bg-violet-500/10 p-6 text-center">
        <div className="text-4xl mb-2">{perfect ? "🐞🏆" : "🐞"}</div>
        <div className="text-white font-bold text-xl">{perfect ? "Perfect Bug Hunter!" : "Bug Hunt Complete"}</div>
        <div className="text-slate-300 mt-2">Fixed <b className="text-white">{correct}</b> of <b className="text-white">{ROUNDS}</b> bugs</div>
        <div className="flex items-center justify-center gap-4 mt-4 text-sm">
          <span className="text-cyan-300">+{10 * correct} XP</span>
          <span className="text-amber-300">+{5 * correct} coins</span>
          {perfect && <span className="text-violet-300">🏅 Bug Expert</span>}
        </div>
        <button type="button" onClick={handleCollect} className="mt-5 btn-3d px-6 py-2 text-sm">Collect Rewards</button>
      </motion.div>
    );
  }

  const lines = current.code.split("\n");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-sm text-slate-300">
          <span>Round <b className="text-white">{currentIdx + 1}/{ROUNDS}</b></span>
          <span className="text-emerald-300">Fixed: {correct}</span>
        </div>
        <div className={cn("flex items-center gap-2 text-sm font-bold", timeLeft <= 10 ? "text-rose-400 animate-pulse" : "text-cyan-300")}>
          ⏱ {timeLeft}s
        </div>
        <button type="button" onClick={onQuit} className="text-xs text-slate-500 hover:text-white transition">Quit</button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0b1020]/80 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-rose-400 font-bold text-sm">🔴 {current.errorType.toUpperCase()} ERROR</span>
          <span className="text-slate-400 text-xs">— {current.title}</span>
          <span className="ml-auto text-xs text-violet-300 bg-violet-500/10 border border-violet-500/20 rounded-full px-2 py-0.5">{current.topic}</span>
        </div>
        <p className="text-xs text-slate-400 mb-3">Click on the line that contains the bug:</p>
        <div className="space-y-1">
          {lines.map((line, i) => (
            <motion.button
              key={i} type="button" whileHover={{ x: 2 }}
              onClick={() => !revealed && handleReveal(i)}
              className={cn(
                "w-full text-left flex items-start gap-3 rounded-lg px-3 py-2 font-mono text-xs transition-all",
                revealed && i === current.errorLine - 1 ? "bg-emerald-500/20 border border-emerald-400/40 text-emerald-200" :
                revealed && i === selected ? "bg-rose-500/20 border border-rose-400/40 text-rose-200" :
                selected === i ? "bg-cyan-500/20 border border-cyan-400/40" :
                "hover:bg-white/5 border border-transparent text-slate-300 cursor-pointer"
              )}
            >
              <span className="text-slate-600 select-none w-4 shrink-0">{i + 1}</span>
              <span className="whitespace-pre">{line || " "}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {revealed && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("rounded-xl border p-4 text-sm", selected === current.errorLine - 1 ? "border-emerald-400/30 bg-emerald-500/10" : "border-amber-400/30 bg-amber-500/10")}>
            <div className="font-bold text-white mb-1">{selected === current.errorLine - 1 ? "✅ Correct!" : "❌ Not quite!"}</div>
            <p className="text-slate-300 text-xs leading-relaxed">{current.explanation}</p>
            <div className="mt-3 bg-black/30 rounded-lg p-2 font-mono text-[11px] text-emerald-200">
              <div className="text-slate-400 text-[10px] mb-1">Fixed version:</div>
              {current.fixedCode.split("\n").map((line, i) => <div key={i}>{line}</div>)}
            </div>
            {current.hint && <p className="text-violet-300 text-xs mt-2">💡 {current.hint}</p>}
            <button type="button" onClick={handleNext} className="mt-3 btn-3d btn-3d-cyan px-5 py-2 text-xs">
              {currentIdx + 1 < ROUNDS ? "Next Bug →" : "See Results"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
