import type { Question } from '@/types/game'

/** Simple seeded PRNG (mulberry32). Pass a seed for deterministic output. */
function makeRand(seed: number) {
  let s = seed >>> 0
  return function () {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Generates 4 shuffled multiple-choice options: 1 correct + 3 wrong.
 * Wrong options are drawn from the same difficulty tier, different player.
 * Pass `seed` to make the output deterministic (e.g. for the daily challenge).
 */
export function generateChoices(correct: Question, pool: Question[], seed?: number): string[] {
  const rand = seed !== undefined ? makeRand(seed) : Math.random
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
  const shuffled = candidates.sort(() => rand() - 0.5)
  const wrongs = shuffled.slice(0, 3)

  // Combine and shuffle the final 4
  const all = [correctName, ...wrongs]
  return all.sort(() => rand() - 0.5)
}
