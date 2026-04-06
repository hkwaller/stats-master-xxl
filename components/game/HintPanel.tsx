'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Question, HintType } from '@/types/game'

interface HintPanelProps {
  question: Question
  usedHints: HintType[]       // shared hints revealed this round (visible to all players)
  hintsEnabled: boolean
  onRequestHint: (type: HintType) => void
}

const HINTS: { type: HintType; emoji: string; label: string; getValue: (q: Question) => string }[] =
  [
    {
      type: 'era',
      emoji: '📅',
      label: 'Era',
      getValue: (q) => `Played in the ${q.era}`,
    },
    {
      type: 'team',
      emoji: '🏒',
      label: 'Team',
      getValue: (q) => `Played for ${q.teamNames}`,
    },
    {
      type: 'position',
      emoji: '📍',
      label: 'Position',
      getValue: (q) => positionLabel(q.positionCode),
    },
  ]

function positionLabel(code: string): string {
  const map: Record<string, string> = {
    C: 'Center',
    LW: 'Left Wing',
    RW: 'Right Wing',
    D: 'Defenseman',
    G: 'Goalie',
  }
  return map[code] ?? code
}

export function HintPanel({ question, usedHints, hintsEnabled, onRequestHint }: HintPanelProps) {
  const [open, setOpen] = useState(false)

  if (!hintsEnabled) return null

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-sm text-game-text-muted hover:text-game-text transition-colors"
      >
        <span>💡</span>
        <span className="uppercase tracking-wide font-bold">
          Hints {usedHints.length > 0 ? `(${usedHints.length} used)` : ''}
        </span>
        <span className="text-xs">{open ? '▲' : '▼'}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3 flex flex-wrap gap-2">
              {HINTS.map((hint) => {
                const isUsed = usedHints.includes(hint.type)

                return (
                  <div key={hint.type} className="flex flex-col gap-1">
                    <button
                      onClick={() => !isUsed && onRequestHint(hint.type)}
                      disabled={isUsed}
                      className={`
                        flex items-center gap-2 px-3 py-2 rounded-lg border text-sm
                        transition-all duration-150
                        ${isUsed
                          ? 'bg-game-card-dark border-game-card-border opacity-60 cursor-default'
                          : 'bg-game-card-dark border-game-card-border hover:border-game-gold/50 hover:bg-game-gold/10 cursor-pointer'
                        }
                      `}
                    >
                      <span>{hint.emoji}</span>
                      <span className="font-bold">{hint.label}</span>
                    </button>

                    {/* Reveal hint value if used */}
                    <AnimatePresence>
                      {isUsed && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="px-3 py-1.5 rounded-lg bg-game-gold/10 border border-game-gold/30 text-xs text-game-gold font-bold"
                        >
                          {hint.getValue(question)}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>

            <p className="text-xs text-game-text-muted mt-2">
              Hints are shared — everyone sees them
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
