import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "../../../utils/cn";
import type { GameReward, StoryMission } from "../miniGames.data";
import { STORY_WORLDS } from "../miniGames.data";
import MemoryMatch from "./MemoryMatch";
import BugHunt from "./BugHunt";
import AlgorithmArrange from "./AlgorithmArrange";
import LogicPuzzle from "./LogicPuzzle";

interface Props {
  xp: number;
  completedMissions: string[];
  onMissionComplete: (missionId: string, reward: GameReward) => void;
  onQuit: () => void;
}

type Screen = "worlds" | "missions" | "playing";

export default function StoryMode({ xp, completedMissions, onMissionComplete, onQuit }: Props) {
  const [screen, setScreen] = useState<Screen>("worlds");
  const [selectedWorldId, setSelectedWorldId] = useState<string | null>(null);
  const [activeMission, setActiveMission] = useState<StoryMission | null>(null);

  const selectedWorld = STORY_WORLDS.find(w => w.id === selectedWorldId);

  const handleSelectWorld = (worldId: string) => {
    const world = STORY_WORLDS.find(w => w.id === worldId);
    if (!world || world.locked) return;
    setSelectedWorldId(worldId);
    setScreen("missions");
  };

  const handleStartMission = (mission: StoryMission) => {
    if (completedMissions.includes(mission.id)) return;
    setActiveMission(mission);
    setScreen("playing");
  };

  const handleMissionComplete = (reward: GameReward) => {
    if (!activeMission) return;
    onMissionComplete(activeMission.id, reward);
    setActiveMission(null);
    setScreen("missions");
  };

  const handleQuitMission = () => {
    setActiveMission(null);
    setScreen("missions");
  };

  // Worlds list
  if (screen === "worlds") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-violet-300">Story Mode</p>
            <h3 className="text-white font-bold text-lg">Choose Your World</h3>
          </div>
          <button type="button" onClick={onQuit} className="text-xs text-slate-500 hover:text-white transition">← Back</button>
        </div>
        <div className="space-y-3">
          {STORY_WORLDS.map((world) => {
            const missions = world.missions;
            const completedCount = missions.filter(m => completedMissions.includes(m.id)).length;
            const isUnlocked = xp >= world.requiredXp;
            const pct = Math.round((completedCount / missions.length) * 100);

            return (
              <motion.button
                key={world.id} type="button" whileHover={{ scale: isUnlocked ? 1.01 : 1 }} whileTap={{ scale: 0.99 }}
                onClick={() => isUnlocked && handleSelectWorld(world.id)}
                className={cn(
                  "w-full rounded-2xl border p-4 text-left transition-all",
                  isUnlocked ? "border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer" : "border-white/5 bg-white/[0.02] opacity-60 cursor-not-allowed"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl text-2xl shrink-0 bg-gradient-to-br", world.color, "opacity-90")}>
                      {world.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-white">{world.name}</div>
                      <div className="text-xs text-slate-400">{world.topic} · {missions.length} missions</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {isUnlocked ? (
                      <span className="text-xs text-emerald-300">{completedCount}/{missions.length} done</span>
                    ) : (
                      <span className="text-xs text-slate-500">{world.requiredXp} XP needed</span>
                    )}
                  </div>
                </div>
                {isUnlocked && (
                  <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className={cn("h-full rounded-full bg-gradient-to-r", world.color)} style={{ width: `${pct}%`, transition: "width 0.6s ease" }} />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }

  // Mission list for selected world
  if (screen === "missions" && selectedWorld) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl text-xl bg-gradient-to-br", selectedWorld.color)}>
              {selectedWorld.icon}
            </div>
            <div>
              <h3 className="text-white font-bold">{selectedWorld.name}</h3>
              <p className="text-xs text-slate-400">{selectedWorld.topic}</p>
            </div>
          </div>
          <button type="button" onClick={() => setScreen("worlds")} className="text-xs text-slate-500 hover:text-white transition">← Worlds</button>
        </div>
        <p className="text-xs text-slate-400">{selectedWorld.description}</p>
        <div className="space-y-2">
          {selectedWorld.missions.map((mission, i) => {
            const done = completedMissions.includes(mission.id);
            const prevDone = i === 0 || completedMissions.includes(selectedWorld.missions[i - 1].id);
            const locked = !prevDone && !done;
            return (
              <motion.button
                key={mission.id} type="button" whileHover={{ scale: locked ? 1 : 1.01 }}
                onClick={() => !locked && !done && handleStartMission(mission)}
                className={cn(
                  "w-full rounded-xl border p-4 text-left transition-all",
                  done ? "border-emerald-400/30 bg-emerald-500/10 cursor-default" :
                  locked ? "border-white/5 bg-white/[0.02] opacity-50 cursor-not-allowed" :
                  mission.isBoss ? "border-rose-400/30 bg-rose-500/10 hover:bg-rose-500/15 cursor-pointer" :
                  "border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium text-white">{mission.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{mission.description}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    {done ? <span className="text-emerald-300 text-lg">✅</span> :
                     locked ? <span className="text-slate-500 text-lg">🔒</span> :
                     mission.isBoss ? <span className="text-rose-400 text-lg">⚔️</span> :
                     <span className="text-cyan-300 text-lg">▶</span>}
                    <div className="text-[10px] text-slate-500 mt-1">+{mission.reward.xp} XP</div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }

  // Playing a mission
  if (screen === "playing" && activeMission) {
    const type = activeMission.type === "boss" ? "bug" : activeMission.type;
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-2 flex items-center gap-2 text-xs text-violet-200">
          <span>📖 Story Mission:</span>
          <span className="font-semibold text-white">{activeMission.title}</span>
          {activeMission.isBoss && <span className="ml-auto text-rose-400 font-bold">BOSS BATTLE</span>}
        </div>

        {type === "memory" && (
          <MemoryMatch
            onComplete={(r) => handleMissionComplete({ ...r, xp: r.xp + activeMission.reward.xp, coins: r.coins + activeMission.reward.coins })}
            onQuit={handleQuitMission}
          />
        )}
        {type === "bug" && (
          <BugHunt
            onComplete={(r) => handleMissionComplete({ ...r, xp: r.xp + activeMission.reward.xp, coins: r.coins + activeMission.reward.coins })}
            onQuit={handleQuitMission}
          />
        )}
        {type === "algorithm" && (
          <AlgorithmArrange
            onComplete={(r) => handleMissionComplete({ ...r, xp: r.xp + activeMission.reward.xp, coins: r.coins + activeMission.reward.coins })}
            onQuit={handleQuitMission}
          />
        )}
        {type === "logic" && (
          <LogicPuzzle
            onComplete={(r) => handleMissionComplete({ ...r, xp: r.xp + activeMission.reward.xp, coins: r.coins + activeMission.reward.coins })}
            onQuit={handleQuitMission}
          />
        )}
      </div>
    );
  }

  return null;
}
