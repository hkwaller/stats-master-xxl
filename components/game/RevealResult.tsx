'use client'

import { motion } from 'framer-motion'
import { MonoLabel } from '@/components/design-system'
import type { Question, QuestionResult } from '@/types/game'

const INK = 'var(--color-ink)'

/**
 * Your result for the card that was just revealed. The outcome is spelled out
 * (GOAL / WIDE / NO SHOT) and the answer is always stated, right or wrong.
 */
export function RevealResult({
  question,
  history,
  myId,
}: {
  question: Question
  history: QuestionResult[]
  myId: string
}) {
  const latest = history.length > 0 ? history[history.length - 1] : null
  const myResult = latest?.playerAnswers?.[myId]
  const isCorrect = myResult?.correct ?? false
  const points = myResult?.points ?? 0
  const hasAnswered = isCorrect || Boolean(myResult?.answer?.trim())

  const verdict = !hasAnswered ? 'No shot' : isCorrect ? 'Goal!' : 'Wide'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="relative flex flex-col gap-3 p-4"
      style={{
        background: isCorrect ? 'var(--color-mint)' : '#ffffff',
        border: `3px solid ${INK}`,
        borderRadius: 16,
        boxShadow: `4px 4px 0 ${INK}`,
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-display" style={{ fontSize: 40, lineHeight: 1, textTransform: 'uppercase' }}>
          {verdict}
        </span>
        <span className="font-mono tabular-nums" style={{ fontSize: 26, fontWeight: 700 }}>
          {points > 0 ? `+${points}` : points}
        </span>
      </div>

      <div
        className="flex flex-col gap-1.5 rounded-[10px] p-3"
        style={{ background: 'var(--color-lemon)', border: `2px solid ${INK}` }}
      >
        <MonoLabel color={INK}>The card was</MonoLabel>
        <span className="reveal-name font-display" style={{ fontSize: 30, lineHeight: 1, textTransform: 'uppercase' }}>
          {question.firstName} {question.lastName}
        </span>
        <MonoLabel color={INK}>
          {question.season} · {question.teamAbbrevs} · {question.positionCode}
        </MonoLabel>
      </div>
      {hasAnswered && !isCorrect && myResult?.answer && (
        <MonoLabel color={INK}>You said {myResult.answer}</MonoLabel>
      )}
    </motion.div>
  )
}
