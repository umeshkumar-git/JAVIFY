import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../../utils/cn";
import type { GameReward } from "../miniGames.data";
import { MEMORY_CARDS } from "../miniGames.data";

interface Props { onComplete: (reward: GameReward, stats: { moves: number; timeSeconds: number }) => void; onQuit: () => void; }

function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5); }

export default function MemoryMatch({ onComplete, onQuit }: Props) {
  const GRID = 8; // 8 pairs = 16 cards
  const [cards, setCards] = useState<{ id: string; cardId: string; front: string; back: string; isFlipped: boolean; isMatched: boolean }[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matched, setMatched] = useState(0);
  const [startTime] = useState(Date.now());
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    const pool = shuffle(MEMORY_CARDS).slice(0, GRID);
    const deck = shuffle([
      ...pool.map((c, i) => ({ id: `f-${i}`, cardId: c.id, front: c.front, back: c.back, isFlipped: false, isMatched: false })),
      ...pool.map((c, i) => ({ id: `b-${i}`, cardId: c.id, front: c.back, back: c.front, isFlipped: false, isMatched: false })),
    ]);
    setCards(deck);
  }, []);

  const handleFlip = useCallback((index: number) => {
    if (selected.length === 2) return;
    if (cards[index].isFlipped || cards[index].isMatched) return;

    const next = cards.map((c, i) => i === index ? { ...c, isFlipped: true } : c);
    setCards(next);
    const newSel = [...selected, index];
    setSelected(newSel);

    if (newSel.length === 2) {
      setMoves(m => m + 1);
      const [a, b] = newSel;
      if (next[a].cardId === next[b].cardId) {
        setTimeout(() => {
          setCards(prev => prev.map((c, i) => newSel.includes(i) ? { ...c, isMatched: true } : c));
          setMatched(m => {
            const nm = m + 1;
            if (nm === GRID) { setShowResult(true); }
            return nm;
          });
          setSelected([]);
        }, 500);
      } else {
        setTimeout(() => {
          setCards(prev => prev.map((c, i) => newSel.includes(i) ? { ...c, isFlipped: false } : c));
          setSelected([]);
        }, 900);
      }
    }
  }, [cards, selected]);

  const handleCollect = () => {
    const seconds = Math.round((Date.now() - startTime) / 1000);
    const bonusXp = moves < 12 ? 5 : 0;
    onComplete({ xp: 10 + bonusXp, coins: 5 + (moves < 12 ? 3 : 0) }, { moves, timeSeconds: seconds });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm text-slate-300">
          <span>Pairs: <b className="text-white">{matched}/{GRID}</b></span>
          <span>Moves: <b className="text-white">{moves}</b></span>
        </div>
        <button type="button" onClick={onQuit} className="text-xs text-slate-500 hover:text-white transition">Quit</button>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {cards.map((card, i) => (
          <motion.button
            key={card.id} type="button" whileTap={{ scale: 0.95 }}
            onClick={() => handleFlip(i)}
            className={cn(
              "relative h-14 sm:h-16 rounded-xl border text-xs font-semibold overflow-hidden transition-all",
              card.isMatched ? "border-emerald-400/40 bg-emerald-500/15 cursor-default" :
              card.isFlipped ? "border-cyan-400/40 bg-cyan-500/10 cursor-default" :
              "border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer"
            )}
          >
            <AnimatePresence mode="wait">
              {card.isFlipped || card.isMatched ? (
                <motion.span key="front" initial={{ rotateY: 90 }} animate={{ rotateY: 0 }} className="block w-full h-full flex items-center justify-center px-1 text-center text-[10px] sm:text-xs text-white leading-tight">
                  {card.front}
                </motion.span>
              ) : (
                <motion.span key="back" className="block w-full h-full flex items-center justify-center text-xl text-slate-600">
                  ☕
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {showResult && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border border-emerald-400/30 bg-emerald-500/15 p-5 text-center">
            <div className="text-3xl mb-2">🏆</div>
            <div className="text-white font-bold text-lg">Memory Master!</div>
            <div className="text-slate-300 text-sm mt-1">Completed in {moves} moves</div>
            <div className="flex items-center justify-center gap-4 mt-3 text-sm">
              <span className="text-cyan-300">+{10 + (moves < 12 ? 5 : 0)} XP</span>
              <span className="text-amber-300">+{5 + (moves < 12 ? 3 : 0)} coins</span>
              {moves < 12 && <span className="text-violet-300">⚡ Speed Bonus!</span>}
            </div>
            <button type="button" onClick={handleCollect} className="mt-4 btn-3d px-6 py-2 text-sm">Collect Rewards</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
