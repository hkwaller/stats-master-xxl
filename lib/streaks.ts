import type { Player, QuestionResult } from '@/types/game'

/**
 * Current streak = trailing run of correct answers in the question history.
 * Derived rather than stored — the design needs it, the game state does not.
 */
export function currentStreak(history: QuestionResult[], playerId: string): number {
  let streak = 0
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i]?.playerAnswers?.[playerId]?.correct) streak++
    else break
  }
  return streak
}

export function streakLeader(
  history: QuestionResult[],
  players: Player[],
): { player: Player; streak: number } | null {
  let best: { player: Player; streak: number } | null = null
  for (const p of players) {
    const streak = currentStreak(history, p.id)
    if (streak > 0 && (!best || streak > best.streak)) best = { player: p, streak }
  }
  return best
}

/** Correct-answer count and fastest correct answer, for the final board meta line. */
export function playerSummary(
  history: QuestionResult[],
  playerId: string,
): { correct: number; wrong: number } {
  let correct = 0
  let wrong = 0
  for (const round of history) {
    const a = round.playerAnswers?.[playerId]
    if (!a) continue
    if (a.correct) correct++
    else wrong++
  }
  return { correct, wrong }
}
