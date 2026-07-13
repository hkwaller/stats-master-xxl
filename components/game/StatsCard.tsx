'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { Question } from '@/types/game'
import { StatTile } from '@/components/arcade'

interface StatsCardProps {
  question: Question
  revealedColumns: number // 0 = none, 5 = all
}

const COLUMNS: {
  key: keyof Question
  abbr: string
  highlight: boolean
}[] = [
  { key: 'gamesPlayed',    abbr: 'GP',  highlight: false },
  { key: 'goals',          abbr: 'G',   highlight: false },
  { key: 'assists',        abbr: 'A',   highlight: false },
  { key: 'points',         abbr: 'PTS', highlight: true  },
  { key: 'penaltyMinutes', abbr: 'PIM', highlight: false },
]

export function StatsCard({ question, revealedColumns }: StatsCardProps) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {COLUMNS.map((col, colIndex) => {
          const isRevealed = colIndex < revealedColumns

          return (
            <AnimatePresence key={col.key} mode="wait" initial={false}>
              {isRevealed ? (
                <motion.div
                  key="revealed"
                  initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.05 }}
                >
                  <StatTile
                    abbr={col.abbr}
                    value={String(question[col.key])}
                    highlight={col.highlight}
                  />
                </motion.div>
              ) : (
                <motion.div key="hidden">
                  <StatTile
                    abbr={col.abbr}
                    value="—"
                    highlight={col.highlight}
                    hidden
                  />
                </motion.div>
              )}
            </AnimatePresence>
          )
        })}
      </div>
    </div>
  )
}
