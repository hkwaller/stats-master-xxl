'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import type { H2HPair, Question } from '@/types/game'
import { MonoLabel } from '@/components/design-system'

const INK = '#0d1b2a'
const RED = '#cf0a2c'
const DEAD = '#b3c0cf'

interface H2HComparisonCardProps {
  pair: H2HPair
  myAnswer?: string // 'left' | 'right' | undefined
  revealed?: boolean // show correct side after reveal
  onAnswer?: (side: 'left' | 'right') => void
}

const ROWS: { key: keyof Question; label: string; emphasis?: boolean }[] = [
  { key: 'season', label: 'Season' },
  { key: 'gamesPlayed', label: 'GP' },
  { key: 'goals', label: 'G' },
  { key: 'assists', label: 'A' },
  { key: 'points', label: 'PTS', emphasis: true },
  { key: 'penaltyMinutes', label: 'PIM' },
]

function StatRow({
  label,
  value,
  emphasis,
  dimmed,
}: {
  label: string
  value: string | number
  emphasis?: boolean
  dimmed?: boolean
}) {
  return (
    <div
      className="flex items-baseline justify-between gap-3 py-1.5"
      style={{ borderBottom: '1px solid rgba(13,27,42,0.07)' }}
    >
      <MonoLabel size={9} tracking="0.18em">{label}</MonoLabel>
      <span
        className="font-display tabular-nums"
        style={{
          fontWeight: emphasis ? 800 : 700,
          fontSize: 21,
          lineHeight: 1,
          color: dimmed ? '#7d8b9c' : emphasis ? RED : INK,
        }}
      >
        {value}
      </span>
    </div>
  )
}

/** One of the two stat lines. A white plane whose left edge carries the state. */
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
  const edge = revealed ? (isCorrect ? RED : DEAD) : isSelected ? RED : INK
  const locked = revealed || isSelected

  return (
    <motion.button
      onClick={onClick}
      disabled={locked}
      whileTap={!locked ? { y: 1 } : undefined}
      animate={{ opacity: dimmed ? 0.55 : 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`flex-1 p-4 text-left ${wrongPick ? 'penalty-hatch' : ''}`}
      style={{
        borderWidth: '0 0 0 5px',
        borderStyle: 'solid',
        borderColor: edge,
        borderRadius: 0,
        background: revealed && isCorrect ? 'rgba(207,10,44,0.07)' : '#ffffff',
        boxShadow: wrongPick ? 'none' : '0 2px 10px rgba(13,27,42,0.07)',
        cursor: locked ? 'default' : 'pointer',
        transition: 'background-color 200ms ease-out, border-color 200ms ease-out',
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <MonoLabel size={9} tracking="0.22em">
          Line {side === 'left' ? 'A' : 'B'}
        </MonoLabel>
        {revealed && isCorrect && <Check size={14} strokeWidth={2.4} color={RED} />}
        {isSelected && !revealed && <MonoLabel size={9} tracking="0.14em" color={RED}>Your pick</MonoLabel>}
      </div>

      {revealed && isCorrect && (
        <div className="mb-3">
          <span
            className="font-display"
            style={{ fontWeight: 800, fontSize: 24, lineHeight: 1, textTransform: 'uppercase' }}
          >
            {question.firstName} {question.lastName}
          </span>
        </div>
      )}

      <div className="flex flex-col">
        {ROWS.map((r) => (
          <StatRow
            key={r.label}
            label={r.label}
            value={String(question[r.key] ?? '—')}
            emphasis={r.emphasis}
            dimmed={dimmed}
          />
        ))}
      </div>
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
        <MonoLabel size={9}>Which stat line belongs to</MonoLabel>
        <h2
          className="font-display m-0"
          style={{
            fontWeight: 800,
            fontSize: 'clamp(28px,5vw,44px)',
            lineHeight: 1,
            textTransform: 'uppercase',
          }}
        >
          {pair.targetName}
        </h2>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
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
        <MonoLabel size={9}>Tap a line to lock it in</MonoLabel>
      )}
    </div>
  )
}
