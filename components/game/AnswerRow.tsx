'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

const INK = 'var(--color-ink)'
const CHOICE_BADGES: Record<string, string> = {
  B: 'var(--color-lemon)',
  C: 'var(--color-tangerine)',
  D: 'var(--color-pink)',
}

export type AnswerState = 'default' | 'selected' | 'eliminated' | 'correct' | 'faded'

interface AnswerRowProps {
  letter: string
  name: string
  /** A stamp on the card: "LOCKED IN", "PENALTY BOX", or a count like "3 PICKS". */
  meta?: string
  state?: AnswerState
  /**
   * tv: padded row. phone: 68px row. compact: 54px row for screens that also
   * carry a board and hints. card: the TV's classic answer grid.
   */
  variant?: 'tv' | 'phone' | 'compact' | 'card'
  colorByLetter?: boolean
  onClick?: () => void
  disabled?: boolean
}

const LOOK: Record<AnswerState, { bg: string; fg: string; border: string; offset: boolean }> = {
  default: { bg: '#ffffff', fg: INK, border: `3px solid ${INK}`, offset: true },
  selected: { bg: 'var(--color-cobalt)', fg: '#ffffff', border: `3px solid ${INK}`, offset: true },
  correct: { bg: 'var(--color-mint)', fg: INK, border: `3px solid ${INK}`, offset: true },
  eliminated: { bg: 'transparent', fg: 'var(--color-ink-4)', border: '2.5px dashed var(--color-edge-dead)', offset: false },
  faded: { bg: '#ffffff', fg: INK, border: '3px solid var(--color-edge-dead)', offset: false },
}

/**
 * An answer as a white card in an ink frame. State never rides on colour
 * alone: your pick carries a check and LOCKED IN, the right answer a check,
 * an eliminated answer is struck through with a PENALTY BOX stamp.
 */
export function AnswerRow({
  letter,
  name,
  meta,
  state = 'default',
  variant = 'tv',
  colorByLetter = false,
  onClick,
  disabled,
}: AnswerRowProps) {
  const look = LOOK[state]
  const eliminated = state === 'eliminated'
  const checked = state === 'selected' || state === 'correct'
  const interactive = Boolean(onClick) && !disabled
  const card = variant === 'card'
  const Tag = onClick ? motion.button : motion.div

  const choiceBadge = colorByLetter ? CHOICE_BADGES[letter] : undefined
  const nameSize = variant === 'tv' || card ? 28 : variant === 'compact' ? 22 : 25
  const stampMeta = meta && (state === 'selected' || eliminated)

  return (
    <Tag
      onClick={interactive ? onClick : undefined}
      disabled={onClick ? disabled : undefined}
      whileTap={interactive ? { x: 2, y: 2, boxShadow: `2px 2px 0 ${INK}` } : undefined}
      animate={{ opacity: state === 'faded' ? 0.5 : 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      aria-pressed={onClick ? state === 'selected' : undefined}
      className={`relative flex min-w-0 w-full items-center text-left ${eliminated ? 'penalty-hatch' : ''}`}
      style={{
        background: look.bg,
        color: look.fg,
        border: look.border,
        borderRadius: 14,
        boxShadow: look.offset ? `4px 4px 0 ${INK}` : 'none',
        transform: state === 'selected' ? 'rotate(-1deg)' : undefined,
        gap: 12,
        padding: card ? '10px 12px' : variant === 'tv' ? '14px 16px' : '0 14px',
        minHeight: card || variant === 'phone' ? 68 : variant === 'compact' ? 54 : undefined,
        cursor: interactive ? 'pointer' : 'default',
        transition: 'background-color 200ms ease-out',
      }}
    >
      <span
        aria-hidden={checked || undefined}
        className="font-display flex shrink-0 items-center justify-center"
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: checked || eliminated ? '#ffffff' : choiceBadge ?? 'var(--color-cobalt)',
          color: state === 'selected' ? 'var(--color-cobalt)' : eliminated ? 'var(--color-ink-2)' : checked || choiceBadge ? INK : '#ffffff',
          fontSize: 17,
        }}
      >
        {checked ? <Check size={18} strokeWidth={3.4} /> : letter}
      </span>
      {checked && <span className="sr-only">{letter}</span>}

      <span
        className={`font-display min-w-0 flex-1 ${card ? '[overflow-wrap:anywhere]' : 'truncate'}`}
        style={{
          fontSize: nameSize,
          lineHeight: 1.02,
          letterSpacing: '0.01em',
          textTransform: 'uppercase',
          textDecoration: eliminated ? 'line-through' : undefined,
        }}
      >
        {name}
      </span>

      {meta &&
        (stampMeta ? (
          <span
            className="font-mono absolute"
            style={{
              top: -12,
              right: 10,
              background: eliminated ? 'var(--color-pink)' : 'var(--color-lemon)',
              color: INK,
              border: `2px solid ${INK}`,
              borderRadius: 6,
              padding: '2px 8px',
              fontSize: 12,
              fontWeight: 700,
              transform: eliminated ? 'rotate(-4deg)' : 'rotate(5deg)',
              whiteSpace: 'nowrap',
            }}
          >
            {meta}
          </span>
        ) : (
          <span
            className="font-mono shrink-0"
            style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', opacity: 0.85 }}
          >
            {meta}
          </span>
        ))}
    </Tag>
  )
}
