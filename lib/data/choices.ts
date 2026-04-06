import type { Question } from '@/types/game'

/**
 * Generates 4 shuffled multiple-choice options: 1 correct + 3 wrong.
 * Wrong options are drawn from the same difficulty tier, different player.
 */
export function generateChoices(correct: Question, pool: Question[]): string[] {
  const correctName = `${correct.firstName} ${correct.lastName}`

  // Filter: same tier, different playerId, de-duplicated by playerId
  const seen = new Set<number>([correct.playerId])
  const candidates: string[] = []
  for (const q of pool) {
    if (q.difficulty !== correct.difficulty) continue
    if (seen.has(q.playerId)) continue
    seen.add(q.playerId)
    candidates.push(`${q.firstName} ${q.lastName}`)
  }

  // Shuffle candidates and pick 3 wrong answers
  const shuffled = candidates.sort(() => Math.random() - 0.5)
  const wrongs = shuffled.slice(0, 3)

  // Combine and shuffle the final 4
  const all = [correctName, ...wrongs]
  return all.sort(() => Math.random() - 0.5)
}
