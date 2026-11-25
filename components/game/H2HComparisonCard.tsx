'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import type { H2HPair, Question } from '@/types/game'
import { MonoLabel } from '@/components/design-system'

const INK = 'var(--color-ink)'

interface H2HComparisonCardProps {
  pair: H2HPair
  myAnswer?: string // 'left' | 'right' | undefined
  revealed?: boolean // show correct side after reveal
  onAnswer?: (side: 'left' | 'right') => void
}

const ROWS: { key: keyof Question; label: string; keyStat?: boolean }[] = [
  { key: 'season', label: 'Season' },
  { key: 'gamesPlayed', label: 'GP' },
  { key: 'goals', label: 'G' },
  { key: 'assists', label: 'A' },
  { key: 'points', label: 'PTS', keyStat: true },
  { key: 'penaltyMinutes', label: 'PIM' },
]

/**
 * One of the two stat lines, as a card back. Your pick carries LOCKED IN; on
 * reveal the right line turns mint with the name, a wrong pick is struck WIDE.
 */
function PlayerCard({
  question,
  side,
  isCorrect,
  isSelected,
  revealed,
  onClick,
}: {
  question: Question
  side: 'left' | 'right'
  isCorrect: boolean
  isSelected: boolean
  revealed: boolean
  onClick?: () => void
}) {
  const wrongPick = revealed && isSelected && !isCorrect
  const dimmed = revealed && !isCorrect && !isSelected
  const locked = revealed || isSelected
  const stamp = revealed ? (isCorrect ? null : wrongPick ? 'WIDE' : null) : isSelected ? 'LOCKED IN' : null

  return (
    <motion.button
      onClick={onClick}
      disabled={locked}
      aria-pressed={isSelected}
      whileTap={!locked ? { x: 2, y: 2 } : undefined}
      animate={{ opacity: dimmed ? 0.5 : 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`relative min-w-0 flex-1 p-3 text-left sm:p-4 ${wrongPick ? 'penalty-hatch' : ''}`}
      style={{
        border: wrongPick ? '2.5px dashed var(--color-edge-dead)' : `3px solid ${INK}`,
        outline: isSelected && !revealed ? '3px solid var(--color-cobalt)' : undefined,
        outlineOffset: 3,
        borderRadius: 16,
        background: revealed && isCorrect ? 'var(--color-mint)' : wrongPick ? 'transparent' : '#ffffff',
        boxShadow: wrongPick || dimmed ? 'none' : `4px 4px 0 ${INK}`,
        cursor: locked ? 'default' : 'pointer',
        color: INK,
      }}
    >
      {stamp && (
        <span
          className="font-mono absolute"
          style={{
            top: -12,
            right: 10,
            background: stamp === 'WIDE' ? 'var(--color-pink)' : 'var(--color-lemon)',
            border: `2px solid ${INK}`,
            borderRadius: 6,
            padding: '2px 8px',
            fontSize: 12,
            fontWeight: 700,
            transform: 'rotate(5deg)',
          }}
        >
          {stamp}
        </span>
      )}
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span
          className="font-display flex items-center justify-center"
          style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-cobalt)', color: '#fff', fontSize: 17 }}
        >
          {revealed && isCorrect ? <Check size={18} strokeWidth={3.2} aria-label="Correct" /> : side === 'left' ? 'A' : 'B'}
        </span>
        <MonoLabel color={INK}>Line {side === 'left' ? 'A' : 'B'}</MonoLabel>
      </div>

      {revealed && isCorrect && (
        <span
          className="font-display mb-2.5 block"
          style={{ fontSize: 26, lineHeight: 1, textTransform: 'uppercase' }}
        >
          {question.firstName} {question.lastName}
        </span>
      )}

      <dl className="m-0 flex flex-col">
        {ROWS.map((r) => (
          <div
            key={r.label}
            className="flex items-baseline justify-between gap-3 px-1.5 py-1.5"
            style={{
              borderBottom: '2px solid var(--color-ice-2)',
              background: r.keyStat ? 'var(--color-lemon)' : undefined,
              borderRadius: r.keyStat ? 6 : undefined,
            }}
          >
            <dt className="font-mono" style={{ fontSize: 11, fontWeight: 700, color: r.keyStat ? INK : 'var(--color-ink-2)' }}>
              {r.label.toUpperCase()}
            </dt>
            <dd className="font-mono m-0 tabular-nums" style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>
              {String(question[r.key] ?? '-')}
            </dd>
          </div>
        ))}
      </dl>
    </motion.button>
  )
}

export function H2HComparisonCard({
  pair,
  myAnswer,
  revealed = false,
  onAnswer,
}: H2HComparisonCardProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <MonoLabel size={12}>Which card back belongs to</MonoLabel>
        <h2
          className="font-display m-0"
          style={{
            fontSize: 'clamp(30px,5vw,48px)',
            lineHeight: 1,
            textTransform: 'uppercase',
          }}
        >
          {pair.targetName}
        </h2>
      </div>

      <div className="flex flex-row gap-3 sm:gap-4">
        <PlayerCard
          question={pair.left}
          side="left"
          isCorrect={pair.correctSide === 'left'}
          isSelected={myAnswer === 'left'}
          revealed={revealed}
          onClick={() => onAnswer?.('left')}
        />
        <PlayerCard
          question={pair.right}
          side="right"
          isCorrect={pair.correctSide === 'right'}
          isSelected={myAnswer === 'right'}
          revealed={revealed}
          onClick={() => onAnswer?.('right')}
        />
      </div>

      {!revealed && !myAnswer && onAnswer && (
        <MonoLabel>Tap a line to lock it in</MonoLabel>
      )}
    </div>
  )
}
