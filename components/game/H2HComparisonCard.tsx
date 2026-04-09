"use client";

import { motion } from "framer-motion";
import type { H2HPair, Question } from "@/types/game";

interface H2HComparisonCardProps {
  pair: H2HPair;
  myAnswer?: string;            // 'left' | 'right' | undefined
  revealed?: boolean;           // show correct side after reveal
  onAnswer?: (side: "left" | "right") => void;
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center border-b border-black/10 py-1.5 last:border-b-0">
      <span className="text-xs text-black/60 font-bold uppercase tracking-wide">{label}</span>
      <span className="font-bold tabular-nums text-black">{value}</span>
    </div>
  );
}

function PlayerCard({
  question,
  side,
  isCorrect,
  isSelected,
  revealed,
  onClick,
}: {
  question: Question;
  side: "left" | "right";
  isCorrect: boolean;
  isSelected: boolean;
  revealed: boolean;
  onClick?: () => void;
}) {
  let bg = "bg-white";
  if (revealed) {
    bg = isCorrect ? "bg-lime" : "bg-game-red/20";
  } else if (isSelected) {
    bg = "bg-cyan";
  }

  return (
    <motion.button
      onClick={onClick}
      disabled={!!revealed || !!isSelected}
      whileTap={!revealed && !isSelected ? { scale: 0.97 } : undefined}
      whileHover={!revealed && !isSelected ? { scale: 1.01 } : undefined}
      className={`
        flex-1 ${bg} border-4 border-black shadow-[4px_4px_0_#000] p-4
        text-left transition-all
        disabled:cursor-default
        ${!revealed && !isSelected ? "cursor-pointer hover:shadow-[6px_6px_0_#000] hover:translate-x-[-2px] hover:translate-y-[-2px]" : ""}
      `}
    >
      <div className="text-xs font-bold uppercase tracking-widest text-black/50 mb-3">
        Player {side === "left" ? "A" : "B"}
        {revealed && isCorrect && (
          <span className="ml-2 text-green-700">✓ {question.firstName} {question.lastName}</span>
        )}
      </div>
      <div className="space-y-1">
        <StatRow label="Season" value={question.season} />
        <StatRow label="GP" value={question.gamesPlayed} />
        <StatRow label="G" value={question.goals} />
        <StatRow label="A" value={question.assists} />
        <StatRow label="PTS" value={question.points} />
        <StatRow label="PIM" value={question.penaltyMinutes} />
      </div>
      {isSelected && !revealed && (
        <div className="mt-3 text-center text-xs font-bold uppercase tracking-widest text-black/60">
          Your pick
        </div>
      )}
    </motion.button>
  );
}

export function H2HComparisonCard({
  pair,
  myAnswer,
  revealed = false,
  onAnswer,
}: H2HComparisonCardProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-black/60 uppercase tracking-widest font-bold">
          Which stat line belongs to
        </p>
        <h2 className="text-3xl font-bold text-black mt-1">
          {pair.targetName}?
        </h2>
      </div>

      <div className="flex gap-4">
        <PlayerCard
          question={pair.left}
          side="left"
          isCorrect={pair.correctSide === "left"}
          isSelected={myAnswer === "left"}
          revealed={revealed}
          onClick={() => onAnswer?.("left")}
        />
        <PlayerCard
          question={pair.right}
          side="right"
          isCorrect={pair.correctSide === "right"}
          isSelected={myAnswer === "right"}
          revealed={revealed}
          onClick={() => onAnswer?.("right")}
        />
      </div>

      {!revealed && !myAnswer && (
        <p className="text-center text-xs text-black/50 uppercase tracking-widest">
          Tap a player card to select
        </p>
      )}
    </div>
  );
}
