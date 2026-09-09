'use client'

import { motion } from 'framer-motion'
import { ArrowDown, ArrowUp, Check } from 'lucide-react'
import type { HLComparisonField, HLPair } from '@/types/game'
import { MonoLabel } from '@/components/design-system'
import { JumbotronPanel } from '@/components/arcade'

const INK = '#0d1b2a'
const RED = '#cf0a2c'
const DEAD = '#b3c0cf'
const LED = '#ffb01f'

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

export function HigherLowerCard({
  pair,
  myAnswer,
  revealed = false,
  onAnswer,
}: HigherLowerCardProps) {
  const fieldLabel = FIELD_DISPLAY[pair.field] ?? pair.field
  const hasAnswered = Boolean(myAnswer)

  return (
    <div className="flex flex-col gap-5">
      {/* Reference — a plain white plane. */}
      <div className="flex flex-col gap-3">
        <MonoLabel size={9}>Reference</MonoLabel>
        <div
          className="flex items-end justify-between gap-4 p-4"
          style={{
            background: '#fff',
            borderLeft: `5px solid ${INK}`,
            boxShadow: '0 2px 10px rgba(13,27,42,0.07)',
          }}
        >
          <div className="flex min-w-0 flex-col gap-1.5">
            <span
              className="font-display truncate"
              style={{ fontWeight: 700, fontSize: 26, lineHeight: 1, textTransform: 'uppercase' }}
            >
              {pair.reference.firstName} {pair.reference.lastName}
            </span>
            <MonoLabel size={9} tracking="0.14em">
              {pair.reference.season} · {pair.reference.teamAbbrevs}
            </MonoLabel>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span
              className="font-display tabular-nums"
              style={{ fontWeight: 800, fontSize: 46, lineHeight: 0.85, color: INK }}
            >
              {pair.referenceValue}
            </span>
            <MonoLabel size={9} tracking="0.16em">{fieldLabel}</MonoLabel>
          </div>
        </div>
      </div>

      {/* Challenge — the hidden number lives on the jumbotron. */}
      <div className="flex flex-col gap-3">
        <MonoLabel size={9}>Challenge</MonoLabel>
        <JumbotronPanel bezel={8} screenPad="18px 20px">
          <div className="flex items-end justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-2">
              <span
                className="font-mono"
                style={{ fontSize: 9, letterSpacing: '0.28em', color: 'rgba(255,176,31,0.6)' }}
              >
                {pair.challenge.season} · {pair.challenge.teamAbbrevs}
              </span>
              <span
                className="truncate"
                style={{
                  fontFamily: 'var(--font-led)',
                  fontWeight: 700,
                  fontSize: 34,
                  lineHeight: 0.9,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: LED,
                }}
              >
                {pair.challenge.firstName} {pair.challenge.lastName}
              </span>
            </div>

            {revealed ? (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
                className="led-glow tabular-nums shrink-0"
                style={{
                  fontFamily: 'var(--font-led)',
                  fontWeight: 700,
                  fontSize: 62,
                  lineHeight: 0.8,
                  color: LED,
                }}
              >
                {pair.challengeValue}
              </motion.span>
            ) : (
              // Unlit LEDs, matching the jumbotron's own placeholder.
              <span
                role="img"
                aria-label="Not revealed yet"
                className="shrink-0"
                style={{
                  display: 'block',
                  width: 96,
                  height: 26,
                  background: 'rgba(255,176,31,0.10)',
                }}
              />
            )}
          </div>
        </JumbotronPanel>
      </div>

      {/* Higher / lower */}
      <div className="grid grid-cols-2 gap-2.5">
        {(['higher', 'lower'] as const).map((choice) => {
          const isMyChoice = myAnswer === choice
          const isCorrect = pair.correctAnswer === choice
          const wrongPick = revealed && isMyChoice && !isCorrect
          const dimmed = revealed && !isCorrect && !isMyChoice
          const edge = revealed ? (isCorrect ? RED : DEAD) : isMyChoice ? RED : INK
          const locked = hasAnswered || revealed

          return (
            <motion.button
              key={choice}
              onClick={() => !locked && onAnswer?.(choice)}
              disabled={locked}
              whileTap={!locked ? { y: 1 } : undefined}
              animate={{ opacity: dimmed ? 0.55 : 1 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={`flex items-center justify-center gap-2.5 ${wrongPick ? 'penalty-hatch' : ''}`}
              style={{
                borderWidth: '0 0 0 5px',
                borderStyle: 'solid',
                borderColor: edge,
                borderRadius: 0,
                padding: '20px 0',
                background: revealed && isCorrect ? 'rgba(207,10,44,0.07)' : '#ffffff',
                boxShadow: wrongPick ? 'none' : '0 2px 10px rgba(13,27,42,0.07)',
                cursor: locked ? 'default' : 'pointer',
                transition: 'background-color 200ms ease-out, border-color 200ms ease-out',
              }}
            >
              {choice === 'higher' ? (
                <ArrowUp size={18} strokeWidth={2.4} color={INK} />
              ) : (
                <ArrowDown size={18} strokeWidth={2.4} color={INK} />
              )}
              <span
                className="font-display"
                style={{
                  fontWeight: 700,
                  fontSize: 24,
                  lineHeight: 1,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: INK,
                }}
              >
                {choice}
              </span>
              {revealed && isCorrect && <Check size={16} strokeWidth={2.4} color={RED} />}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
