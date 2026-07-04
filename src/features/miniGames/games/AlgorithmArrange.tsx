import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../../utils/cn";
import type { GameReward } from "../miniGames.data";
import { ALGORITHM_PUZZLES } from "../miniGames.data";

interface Props { onComplete: (reward: GameReward, stats: { correct: number }) => void; onQuit: () => void; }

export default function AlgorithmArrange({ onComplete, onQuit }: Props) {
  const [puzzleIdx] = useState(() => Math.floor(Math.random() * ALGORITHM_PUZZLES.length));
  const puzzle = ALGORITHM_PUZZLES[puzzleIdx];
  const [items, setItems] = useState(() => [...puzzle.steps].sort(() => Math.random() - 0.5));
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);


  const move = (from: number, to: number) => {
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
  };

  const handleCheck = () => {
    const correct = items.every((item, i) => item.order === i + 1);
    setIsCorrect(correct);
    setChecked(true);
  };

  const handleCollect = () => {
    onComplete({ xp: isCorrect ? 10 : 4, coins: isCorrect ? 6 : 2 }, { correct: isCorrect ? 1 : 0 });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-violet-300 uppercase tracking-widest">{puzzle.topic}</p>
          <h3 className="text-white font-semibold">{puzzle.title}</h3>
          <p className="text-slate-400 text-xs mt-0.5">{puzzle.description}</p>
        </div>
        <button type="button" onClick={onQuit} className="text-xs text-slate-500 hover:text-white transition">Quit</button>
      </div>

      <p className="text-xs text-slate-400">Drag items up/down to reorder, then press Check:</p>

      <div className="space-y-2">
        {items.map((item, i) => (
          <motion.div
            key={item.id}
            layout
            className={cn(
              "rounded-xl border p-3 flex items-center gap-3 text-sm cursor-grab active:cursor-grabbing transition-colors",
              checked && item.order === i + 1 ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200" :
              checked ? "border-rose-400/30 bg-rose-500/5 text-rose-300" :
              "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
            )}
          >
            <span className="text-slate-500 font-mono text-xs w-5 shrink-0">{i + 1}.</span>
            <span className="flex-1">{item.text}</span>
            <div className="flex flex-col gap-0.5 ml-2 shrink-0">
              <button type="button" onClick={() => i > 0 && move(i, i - 1)} disabled={i === 0 || checked} className="text-slate-500 hover:text-white disabled:opacity-20 text-xs leading-none">▲</button>
              <button type="button" onClick={() => i < items.length - 1 && move(i, i + 1)} disabled={i === items.length - 1 || checked} className="text-slate-500 hover:text-white disabled:opacity-20 text-xs leading-none">▼</button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {!checked ? (
          <motion.button type="button" onClick={handleCheck} className="w-full btn-3d py-3 text-sm">
            Check Order
          </motion.button>
        ) : (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("rounded-xl border p-4 text-center", isCorrect ? "border-emerald-400/30 bg-emerald-500/10" : "border-amber-400/30 bg-amber-500/10")}>
            <div className="text-2xl mb-1">{isCorrect ? "🎉" : "📚"}</div>
            <div className="font-bold text-white">{isCorrect ? "Perfect Order!" : "Not quite right"}</div>
            <p className="text-slate-300 text-xs mt-1">
              {isCorrect ? "You understand the algorithm perfectly!" : "Review the correct order — each step is now highlighted."}
            </p>
            <div className="flex items-center justify-center gap-4 mt-3 text-sm">
              <span className="text-cyan-300">+{isCorrect ? 10 : 4} XP</span>
              <span className="text-amber-300">+{isCorrect ? 6 : 2} coins</span>
            </div>
            <button type="button" onClick={handleCollect} className="mt-3 btn-3d px-6 py-2 text-sm">Collect</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
