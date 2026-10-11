'use client'

import { useEffect, useState } from 'react'
import { QUESTION_DURATION_MS } from '@/types/game'

/**
 * Seconds remaining on the per-question answer timer, derived from the
 * `questionStartsAt` timestamp so it resets automatically on every new question.
 *
 * @param questionStartsAt ISO timestamp stamped when the question was launched
 * @param active           whether the timer should be running (i.e. command === 'answering')
 */
export function useQuestionTimeLeft(
  questionStartsAt: string | undefined,
  active: boolean,
  durationMs: number = QUESTION_DURATION_MS,
  pausedDurationMs: number = 0,
  pausedAt?: string,
): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!active || pausedAt) return
    // Re-sync immediately so a new question starts from a full timer.
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [active, questionStartsAt, durationMs, pausedAt])

  if (!questionStartsAt) return durationMs / 1000

  const clockNow = pausedAt ? new Date(pausedAt).getTime() : now
  const elapsed = clockNow - new Date(questionStartsAt).getTime() - pausedDurationMs
  const remainingMs = Math.min(durationMs, Math.max(0, durationMs - elapsed))
  return remainingMs / 1000
}
