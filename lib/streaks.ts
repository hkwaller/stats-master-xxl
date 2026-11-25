import type { Player, QuestionResult } from '@/types/game'

/**
 * Current streak = trailing run of correct answers in the question history.
 * Derived rather than stored - the design needs it, the game state does not.
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

/** Longest run of correct answers anywhere in the game. */
export function longestStreak(history: QuestionResult[], playerId: string): number {
  let best = 0
  let run = 0
  for (const round of history) {
    run = round.playerAnswers?.[playerId]?.correct ? run + 1 : 0
    best = Math.max(best, run)
  }
  return best
}

/** Final-board awards: the longest scoring run and the most correct answers. */
export function gameAwards(
  history: QuestionResult[],
  players: Player[],
): { title: string; player: Player; detail: string }[] {
  const awards: { title: string; player: Player; detail: string }[] = []
  let hot: { player: Player; n: number } | null = null
  let sharp: { player: Player; n: number } | null = null
  for (const p of players) {
    const run = longestStreak(history, p.id)
    if (run > 1 && (!hot || run > hot.n)) hot = { player: p, n: run }
    const { correct } = playerSummary(history, p.id)
    if (correct > 0 && (!sharp || correct > sharp.n)) sharp = { player: p, n: correct }
  }
  if (hot) awards.push({ title: 'Hot hand', player: hot.player, detail: `${hot.n} goals in a row` })
  if (sharp) awards.push({ title: 'Sharpshooter', player: sharp.player, detail: `${sharp.n} of ${history.length} named` })
  return awards
}
