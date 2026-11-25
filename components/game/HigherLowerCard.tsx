'use client'

import { motion } from 'framer-motion'
import { ArrowDown, ArrowUp, Check } from 'lucide-react'
import type { HLComparisonField, HLPair } from '@/types/game'
import { MonoLabel } from '@/components/design-system'

const INK = 'var(--color-ink)'

const FIELD_DISPLAY: Record<HLComparisonField, string> = {
  goals: 'Goals',
  assists: 'Assists',
  points: 'Points',
  penaltyMinutes: 'Penalty minutes',
  gamesPlayed: 'Games played',
}

interface HigherLowerCardProps {
  pair: HLPair
  myAnswer?: string // 'higher' | 'lower' | undefined
  revealed?: boolean
  onAnswer?: (answer: 'higher' | 'lower') => void
}

function PlayerCardFace({
  label,
  name,
  meta,
  children,
  tilt,
}: {
  label: string
  name: string
  meta: string
  children: React.ReactNode
  tilt: number
}) {
  return (
    <div className="flex flex-col gap-2">
      <MonoLabel>{label}</MonoLabel>
      <div
        className="flex items-end justify-between gap-4 p-4"
        style={{
          background: '#fff',
          border: `3px solid ${INK}`,
          borderRadius: 16,
          boxShadow: `4px 4px 0 ${INK}`,
          transform: `rotate(${tilt}deg)`,
        }}
      >
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-display truncate" style={{ fontSize: 28, lineHeight: 1, textTransform: 'uppercase' }}>
            {name}
          </span>
          <MonoLabel>{meta}</MonoLabel>
        </div>
        {children}
      </div>
    </div>
  )
}

/**
 * Two player cards: the reference shows its number, the challenge keeps its
 * number face down on a lemon tab until the reveal.
 */
export function HigherLowerCard({
  pair,
  myAnswer,
  revealed = false,
  onAnswer,
}: HigherLowerCardProps) {
  const fieldLabel = FIELD_DISPLAY[pair.field] ?? pair.field
  const hasAnswered = Boolean(myAnswer)

  const valueTab = (value: React.ReactNode, hidden = false) => (
    <div
      className="flex shrink-0 flex-col items-center px-3 py-1.5"
      style={{
        background: hidden ? 'var(--color-ice-2)' : 'var(--color-lemon)',
        border: hidden ? '2.5px dashed var(--color-edge-dead)' : `2.5px solid ${INK}`,
        borderRadius: 12,
        minWidth: 96,
      }}
    >
      <span className="font-mono tabular-nums" style={{ fontSize: 38, fontWeight: 700, lineHeight: 1.05 }}>
        {value}
      </span>
      <span className="font-mono" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
        {fieldLabel}
      </span>
    </div>
  )

  return (
    <div className="flex flex-col gap-5">
      <PlayerCardFace
        label="Reference"
        name={`${pair.reference.firstName} ${pair.reference.lastName}`}
        meta={`${pair.reference.season} · ${pair.reference.teamAbbrevs}`}
        tilt={-1}
      >
        {valueTab(pair.referenceValue)}
      </PlayerCardFace>

      <PlayerCardFace
        label="Challenge"
        name={`${pair.challenge.firstName} ${pair.challenge.lastName}`}
        meta={`${pair.challenge.season} · ${pair.challenge.teamAbbrevs}`}
        tilt={1}
      >
        {revealed ? (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
            {valueTab(pair.challengeValue)}
          </motion.div>
        ) : (
          <span role="img" aria-label="Not revealed yet">
            {valueTab('?', true)}
          </span>
        )}
      </PlayerCardFace>

      {/* Higher / lower */}
      <div className="grid grid-cols-2 gap-3">
        {(['higher', 'lower'] as const).map((choice) => {
          const isMyChoice = myAnswer === choice
          const isCorrect = pair.correctAnswer === choice
          const wrongPick = revealed && isMyChoice && !isCorrect
          const dimmed = revealed && !isCorrect && !isMyChoice
          const locked = hasAnswered || revealed
          const selected = isMyChoice && !revealed

          return (
            <motion.button
              key={choice}
              onClick={() => !locked && onAnswer?.(choice)}
              disabled={locked}
              aria-pressed={isMyChoice}
              whileTap={!locked ? { x: 2, y: 2 } : undefined}
              animate={{ opacity: dimmed ? 0.5 : 1 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={`relative flex min-h-[64px] items-center justify-center gap-2.5 ${wrongPick ? 'penalty-hatch' : ''}`}
              style={{
                border: wrongPick ? '2.5px dashed var(--color-edge-dead)' : `3px solid ${INK}`,
                borderRadius: 999,
                background: revealed && isCorrect ? 'var(--color-mint)' : selected ? 'var(--color-cobalt)' : wrongPick ? 'transparent' : '#ffffff',
                color: selected ? '#ffffff' : INK,
                boxShadow: wrongPick || dimmed ? 'none' : `4px 4px 0 ${INK}`,
                cursor: locked ? 'default' : 'pointer',
              }}
            >
              {choice === 'higher' ? (
                <ArrowUp size={20} strokeWidth={2.6} aria-hidden />
              ) : (
                <ArrowDown size={20} strokeWidth={2.6} aria-hidden />
              )}
              <span className="font-display" style={{ fontSize: 26, lineHeight: 1, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                {choice}
              </span>
              {revealed && isCorrect && <Check size={18} strokeWidth={3} aria-label="Correct" />}
              {(selected || wrongPick) && (
                <span
                  className="font-mono absolute"
                  style={{
                    top: -12,
                    right: 12,
                    background: wrongPick ? 'var(--color-pink)' : 'var(--color-lemon)',
                    color: INK,
                    border: `2px solid ${INK}`,
                    borderRadius: 6,
                    padding: '2px 8px',
                    fontSize: 12,
                    fontWeight: 700,
                    transform: 'rotate(5deg)',
                  }}
                >
                  {wrongPick ? 'WIDE' : 'LOCKED IN'}
                </span>
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
