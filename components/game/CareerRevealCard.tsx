"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { Question } from "@/types/game";

interface CareerRevealCardProps {
  seasons: Question[];          // all seasons for this player (ordered)
  revealedCount: number;        // how many to show
  buzzedInPlayerName?: string;  // name of who buzzed in (shown on host screen)
  lockedOutCount?: number;      // for "X players locked out" display
}

const FIELD_LABELS: { key: keyof Question; abbr: string; color?: string }[] = [
  { key: "season",       abbr: "Season" },
  { key: "gamesPlayed",  abbr: "GP" },
  { key: "goals",        abbr: "G" },
  { key: "assists",      abbr: "A" },
  { key: "points",       abbr: "PTS", color: "text-[#9d4edd] font-extrabold" },
  { key: "penaltyMinutes", abbr: "PIM" },
];

export function CareerRevealCard({
  seasons,
  revealedCount,
  buzzedInPlayerName,
  lockedOutCount = 0,
}: CareerRevealCardProps) {
  const visible = seasons.slice(0, revealedCount);

  return (
    <div className="w-full space-y-3">
      {buzzedInPlayerName && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-yellow border-4 border-black shadow-[4px_4px_0_#000] px-4 py-2 text-center"
        >
          <span className="font-bold text-black uppercase tracking-widest text-sm">
            🚨 {buzzedInPlayerName} is answering…
          </span>
        </motion.div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-black text-white">
              {FIELD_LABELS.map((f) => (
                <th
                  key={f.abbr}
                  className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-center border border-black/20"
                >
                  {f.abbr}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {visible.map((season, i) => (
                <motion.tr
                  key={season.id}
                  initial={{ opacity: 0, x: -20, backgroundColor: "#fef08a" }}
                  animate={{ opacity: 1, x: 0, backgroundColor: i % 2 === 0 ? "#ffffff" : "#f9fafb" }}
                  transition={{ duration: 0.4, delay: 0.05 }}
                  className="border-b border-black/10"
                >
                  {FIELD_LABELS.map((f) => (
                    <td
                      key={f.abbr}
                      className={`px-3 py-2.5 text-center text-sm tabular-nums border border-black/10 ${f.color ?? "text-black font-semibold"}`}
                    >
                      {String(season[f.key] ?? "—")}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </AnimatePresence>

            {/* Placeholder rows for unrevealed seasons */}
            {seasons.slice(revealedCount).map((_, i) => (
              <tr key={`placeholder-${i}`} className="border-b border-black/10 opacity-30">
                {FIELD_LABELS.map((f) => (
                  <td
                    key={f.abbr}
                    className="px-3 py-2.5 text-center border border-black/10"
                  >
                    <div className="h-4 bg-gray-200 rounded mx-auto w-8" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-game-text-muted px-1">
        <span>
          {revealedCount} / {seasons.length} seasons revealed
        </span>
        {lockedOutCount > 0 && (
          <span className="text-game-red font-bold">
            {lockedOutCount} player{lockedOutCount !== 1 ? "s" : ""} locked out
          </span>
        )}
      </div>
    </div>
  );
}
