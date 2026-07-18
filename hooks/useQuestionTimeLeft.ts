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
): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!active) return
    // Re-sync immediately so a new question starts from a full timer.
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [active, questionStartsAt])

  if (!questionStartsAt) return QUESTION_DURATION_MS / 1000

  const elapsed = now - new Date(questionStartsAt).getTime()
  const remainingMs = Math.min(QUESTION_DURATION_MS, Math.max(0, QUESTION_DURATION_MS - elapsed))
  return remainingMs / 1000
}
