import type { Question } from '../../types/game'
import { SCORE_BASE_BY_TIER, SCORE_DOUBLEDOWN_WRONG, SCORE_SPEED_MAX, SCORE_SPEED_WINDOW_MS } from '../../types/game'

function normalizeAnswer(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ')
}
export function isCorrectAnswer(answer: string, question: Question): boolean {
  if (!answer) return false
  const norm = normalizeAnswer(answer)
  const fullName = normalizeAnswer(`${question.firstName} ${question.lastName}`)
  const lastName = normalizeAnswer(question.lastName)
  return norm === fullName || norm === lastName
}
export function calcScore(
  elapsedMs: number,
  difficulty: import('../../types/game').DifficultyTier,
  doubleDown: boolean,
  correct: boolean,
): number {
  if (!correct) return doubleDown ? SCORE_DOUBLEDOWN_WRONG : 0
  const base = SCORE_BASE_BY_TIER[difficulty] ?? 100
  const speedBonus = Math.round(
    SCORE_SPEED_MAX * Math.max(0, 1 - elapsedMs / SCORE_SPEED_WINDOW_MS),
  )
  const earned = base + speedBonus
  return doubleDown ? earned * 2 : earned
}
