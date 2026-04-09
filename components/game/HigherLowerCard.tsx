'use client'

import { motion } from 'framer-motion'
import type { HLComparisonField, HLPair } from '@/types/game'

const FIELD_DISPLAY: Record<HLComparisonField, string> = {
  goals: 'Goals',
  assists: 'Assists',
  points: 'Points',
  penaltyMinutes: 'Penalty Minutes',
  gamesPlayed: 'Games Played',
}

interface HigherLowerCardProps {
  pair: HLPair
  myAnswer?: string // 'higher' | 'lower' | undefined
  revealed?: boolean
  onAnswer?: (answer: 'higher' | 'lower') => void
}

export function HigherLowerCard({
  pair,
  myAnswer,
  revealed = false,
  onAnswer,
}: HigherLowerCardProps) {
  const fieldLabel = FIELD_DISPLAY[pair.field] ?? pair.field
  const hasAnswered = !!myAnswer

  function buttonClass(choice: 'higher' | 'lower') {
    const isMyChoice = myAnswer === choice
    const isCorrect = pair.correctAnswer === choice

    if (revealed) {
      if (isCorrect) return 'bg-lime border-black text-black'
      if (isMyChoice && !isCorrect) return 'bg-game-red border-black text-white'
      return 'bg-white border-black/30 text-black/40'
    }
    if (isMyChoice) return 'bg-cyan border-black text-black'
    if (hasAnswered) return 'bg-white border-black/30 text-black/40'
    return 'bg-white border-black text-black hover:bg-cyan/30 cursor-pointer'
  }

  return (
    <div className="space-y-6">
      {/* Reference player */}
      <div className="bg-white border-4 border-black shadow-[4px_4px_0_#000] p-5">
        <div className="text-xs font-bold uppercase tracking-widest text-black/50 mb-2">
          Reference
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-black text-lg">
              {pair.reference.firstName} {pair.reference.lastName}
            </p>
            <p className="text-sm text-black/60">
              {pair.reference.season} · {pair.reference.teamAbbrevs}
            </p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold tabular-nums text-black">{pair.referenceValue}</p>
            <p className="text-xs text-black/50 font-bold uppercase">{fieldLabel}</p>
          </div>
        </div>
      </div>

      {/* Challenge player */}
      <div className="bg-white border-4 border-black shadow-[4px_4px_0_#000] p-5">
        <div className="text-xs font-bold uppercase tracking-widest text-black/50 mb-2">
          Challenge
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-black text-lg">
              {pair.challenge.firstName} {pair.challenge.lastName}
            </p>
            <p className="text-sm text-black/60">
              {pair.challenge.season} · {pair.challenge.teamAbbrevs}
            </p>
          </div>
          <div className="text-right">
            {revealed ? (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-4xl font-bold tabular-nums text-black"
              >
                {pair.challengeValue}
              </motion.div>
            ) : (
              <div className="text-4xl font-bold text-black/20">???</div>
            )}
            <p className="text-xs text-black/50 font-bold uppercase">{fieldLabel}</p>
          </div>
        </div>
      </div>

      {/* Higher / Lower buttons */}
      <div className="flex gap-4">
        {(['higher', 'lower'] as const).map((choice) => (
          <motion.button
            key={choice}
            onClick={() => !hasAnswered && !revealed && onAnswer?.(choice)}
            disabled={hasAnswered || revealed}
            whileTap={!hasAnswered && !revealed ? { scale: 0.96 } : undefined}
            whileHover={!hasAnswered && !revealed ? { scale: 1.02 } : undefined}
            className={`
              flex-1 py-5 font-bold text-xl uppercase tracking-widest
              border-4 shadow-[4px_4px_0_#000] transition-all
              disabled:cursor-default
              ${buttonClass(choice)}
            `}
          >
            {choice === 'higher' ? '↑ Higher' : '↓ Lower'}
            {revealed && pair.correctAnswer === choice && (
              <span className="block text-sm font-bold mt-1">{pair.challengeValue}</span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
