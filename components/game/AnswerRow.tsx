'use client'

import { motion } from 'framer-motion'

const INK = '#0d1b2a'
const RED = '#cf0a2c'

export type AnswerState = 'default' | 'selected' | 'eliminated' | 'correct' | 'faded'

interface AnswerRowProps {
  letter: string
  name: string
  /** Team + position, or "PENALTY BOX" when eliminated. */
  meta?: string
  state?: AnswerState
  /** TV rows are padded; phone rows are a fixed 66px. */
  variant?: 'tv' | 'phone'
  onClick?: () => void
  disabled?: boolean
}

/**
 * A white plane with a 5px left edge. Never outlined.
 *
 *  default    — white, navy edge
 *  eliminated — hatched "penalty box" fill, dead edge, no shadow
 *  correct    — red edge over a red wash
 *  faded      — someone else's row after you have answered
 */
export function AnswerRow({
  letter,
  name,
  meta,
  state = 'default',
  variant = 'tv',
  onClick,
  disabled,
}: AnswerRowProps) {
  const eliminated = state === 'eliminated'
  const correct = state === 'correct'
  const selected = state === 'selected'

  const edge = eliminated ? '#b3c0cf' : correct || selected ? RED : INK
  const background = correct ? 'rgba(207,10,44,0.07)' : eliminated ? 'transparent' : '#ffffff'
  const shadow = eliminated ? 'none' : '0 2px 10px rgba(13,27,42,0.09)'
  const nameColor = eliminated ? '#6b7a8c' : INK
  const letterColor = eliminated ? '#7d8b9c' : '#55677d'
  const interactive = Boolean(onClick) && !disabled

  const Tag = onClick ? motion.button : motion.div

  return (
    <Tag
      onClick={interactive ? onClick : undefined}
      disabled={onClick ? disabled : undefined}
      // Flatter than the old system: 1px press, no bounce.
      whileTap={interactive ? { y: 1 } : undefined}
      animate={{ opacity: state === 'faded' ? 0.5 : 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={`flex w-full items-center text-left ${eliminated ? 'penalty-hatch' : ''}`}
      style={{
        // Longhands only: mixing `border` with `borderLeft` makes React warn when
        // the edge colour changes between renders.
        borderWidth: '0 0 0 5px',
        borderStyle: 'solid',
        borderColor: edge,
        borderRadius: 0,
        gap: 14,
        padding: variant === 'tv' ? '15px 18px' : '0 16px',
        height: variant === 'phone' ? 66 : undefined,
        background,
        boxShadow: shadow,
        cursor: interactive ? 'pointer' : 'default',
        transition: 'background-color 200ms ease-out, border-color 200ms ease-out',
      }}
    >
      <span
        className="font-display shrink-0"
        style={{
          fontWeight: 700,
          fontSize: variant === 'tv' ? 17 : 16,
          letterSpacing: '0.08em',
          color: letterColor,
          width: variant === 'tv' ? 14 : 12,
        }}
      >
        {letter}
      </span>

      <span
        className="min-w-0 flex-1 truncate"
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: variant === 'tv' ? 28 : 26,
          lineHeight: 1,
          color: nameColor,
        }}
      >
        {name}
      </span>

      {meta && (
        <span
          className="font-mono shrink-0"
          style={{
            fontSize: variant === 'tv' ? 9 : 8,
            letterSpacing: variant === 'tv' ? '0.16em' : '0.14em',
            color: '#55677d',
            textTransform: 'uppercase',
          }}
        >
          {meta}
        </span>
      )}
    </Tag>
  )
}
