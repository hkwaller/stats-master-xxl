import type { GameState } from '@/types/game'

/** Career possession and a controller pause can overlap; use the first stop. */
export function questionPausedAt(game: Pick<GameState, 'gameMode' | 'pausedAt' | 'careerPausedAt'>): string | undefined {
  const buzzPause = game.gameMode === 'career' ? game.careerPausedAt : undefined
  if (!buzzPause) return game.pausedAt || undefined
  if (!game.pausedAt) return buzzPause
  return new Date(buzzPause).getTime() < new Date(game.pausedAt).getTime() ? buzzPause : game.pausedAt
}

/** Shift deadlines instead of counting time spent in a manual pause as play. */
export function resumedTiming(game: Pick<GameState, 'pausedAt' | 'questionStartsAt' | 'careerPausedAt' | 'careerPenaltyEndsAt'>, now: number) {
  const duration = game.pausedAt ? Math.max(0, now - new Date(game.pausedAt).getTime()) : 0
  const shift = (timestamp: string | undefined) => timestamp
    ? new Date(new Date(timestamp).getTime() + duration).toISOString()
    : ''
  return {
    pausedAt: '',
    questionStartsAt: shift(game.questionStartsAt),
    careerPausedAt: shift(game.careerPausedAt),
    careerPenaltyEndsAt: Object.fromEntries(Object.entries(game.careerPenaltyEndsAt ?? {})
      .map(([id, deadline]) => [id, deadline + duration])),
  }
}

export function careerPenaltySeconds(deadlines: Record<string, number>, now: number): Record<string, number> {
  return Object.fromEntries(Object.entries(deadlines)
    .filter(([, deadline]) => deadline > now)
    .map(([id, deadline]) => [id, Math.ceil((deadline - now) / 1000)]))
}
