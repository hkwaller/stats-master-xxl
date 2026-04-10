'use client'

import { motion } from 'framer-motion'
import type { Question } from '@/types/game'
import { TierBadge, StatLabel } from '@/components/design-system'

interface StatsCardProps {
  question: Question
  revealedColumns: number // 0 = none, 5 = all
}

const COLUMNS: {
  key: keyof Question
  label: string
  abbr: string
  color: string
}[] = [
  {
    key: 'gamesPlayed',
    label: 'Games Played',
    abbr: 'GP',
    color: 'text-black',
  },
  { key: 'goals', label: 'Goals', abbr: 'G', color: 'text-black' },
  { key: 'assists', label: 'Assists', abbr: 'A', color: 'text-black' },
  { key: 'points', label: 'Points', abbr: 'PTS', color: 'text-[#c8102e]' },
  {
    key: 'penaltyMinutes',
    label: 'Penalty Minutes',
    abbr: 'PIM',
    color: 'text-black',
  },
]

export function StatsCard({ question, revealedColumns }: StatsCardProps) {
  return (
    <div className="w-full">
      {/* Difficulty tier badge */}
      {/* <div className="flex items-center mb-3 px-1">
        <TierBadge tier={question.difficulty} />
      </div> */}

      {/* Stat columns grid */}
      <div className="grid grid-cols-5 gap-1 sm:gap-2">
        {COLUMNS.map((col, colIndex) => {
          const isRevealed = colIndex < revealedColumns

          return (
            <motion.div key={col.key} className="relative" initial={false}>
              {isRevealed ? (
                <motion.div
                  key="revealed"
                  initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 30,
                    delay: 0.05,
                  }}
                  className="bg-white border-4 border-black shadow-[4px_4px_0_#000] rounded-none p-2 sm:p-4 flex flex-col items-center gap-1 "
                >
                  <StatLabel>{col.abbr}</StatLabel>
                  <span className={`text-xl sm:text-3xl font-bold tabular-nums ${col.color}`}>
                    {String(question[col.key])}
                  </span>
                  {/* <span className="text-[10px] sm:text-xs text-game-text-muted text-center leading-tight">
                    {col.label}
                  </span> */}
                </motion.div>
              ) : (
                <motion.div
                  key="hidden"
                  className="bg-white border-4 border-black shadow-[4px_4px_0_#000] rounded-none p-2 sm:p-4 flex flex-col items-center gap-1 stat-shimmer min-h-[90px] sm:min-h-[110px]"
                >
                  <StatLabel>{col.abbr}</StatLabel>
                  <div className="w-8 sm:w-10 h-6 sm:h-8 rounded bg-game-card-border/60 mt-1" />
                  <div className="w-10 sm:w-12 h-3 rounded bg-game-card-border/40 mt-1" />
                </motion.div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
