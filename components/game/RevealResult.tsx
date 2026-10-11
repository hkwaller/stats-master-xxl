'use client'

import { motion } from 'framer-motion'
import { MonoLabel } from '@/components/design-system'
import type { Question, QuestionResult } from '@/types/game'

const INK = 'var(--color-ink)'
const RED = 'var(--color-red)'

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

  const headline = !hasAnswered ? 'No answer' : isCorrect ? 'Correct' : 'Missed'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="on-ice flex flex-col gap-4 p-5"
      style={{ borderLeft: `5px solid ${isCorrect ? RED : '#b3c0cf'}` }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span
          className="font-display"
          style={{
            fontWeight: 800,
            fontSize: 34,
            lineHeight: 1,
            textTransform: 'uppercase',
            color: isCorrect ? RED : INK,
          }}
        >
          {headline}
        </span>
        {points !== 0 && (
          <span
            className="font-display tabular-nums"
            style={{
              fontWeight: 800,
              fontSize: 30,
              lineHeight: 1,
              color: points > 0 ? RED : INK,
            }}
          >
            {points > 0 ? `+${points}` : points}
          </span>
        )}
      </div>

      <div
        className="flex flex-col gap-1.5 pt-3"
        style={{ borderTop: '1px solid rgba(13,27,42,0.10)' }}
      >
        <MonoLabel size={9}>The answer was</MonoLabel>
        <span
          className="font-display"
          style={{ fontWeight: 800, fontSize: 30, lineHeight: 1, textTransform: 'uppercase' }}
        >
          {question.firstName} {question.lastName}
        </span>
        <MonoLabel size={9} tracking="0.14em">
          {question.season} · {question.teamAbbrevs} · {question.positionCode}
        </MonoLabel>
        {hasAnswered && !isCorrect && myResult?.answer && (
          <span className="pt-1">
            <MonoLabel size={9} tracking="0.14em">
              You said {myResult.answer}
            </MonoLabel>
          </span>
        )}
      </div>
    </motion.div>
  )
}

