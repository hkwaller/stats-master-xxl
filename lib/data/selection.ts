import type { DifficultyTier, Question } from '@/types/game'
import { getQuestionsByTiers } from './database'

/**
 * Deals Classic questions from the host's chosen difficulty tiers only.
 *
 * `excludeIds` are the seasons this device already played today. They are
 * avoided while fresh seasons in the chosen tiers remain; once those run out
 * the selector repeats a season from earlier today rather than dealing a card
 * from a tier the host switched off.
 */
export class QuestionSelector {
  private pool: Question[]
  private playedToday: Set<string>
  private usedIds = new Set<string>()

  private constructor(pool: Question[], tiers: DifficultyTier[], excludeIds: string[]) {
    const tierSet = new Set(tiers)
    this.pool = pool.filter((q) => tierSet.has(q.difficulty))
    this.playedToday = new Set(excludeIds)
  }

  /** Factory - use instead of `new QuestionSelector(...)` */
  static async create(
    tiers: DifficultyTier[],
    eras?: string[],
    excludeIds: string[] = [],
    rookiesOnly?: boolean,
  ): Promise<QuestionSelector> {
    const pool = await getQuestionsByTiers(tiers, eras, rookiesOnly)
    return new QuestionSelector(pool, tiers, excludeIds)
  }

  selectNext(): Question | null {
    const unused = this.pool.filter((q) => !this.usedIds.has(q.id))
    const fresh = unused.filter((q) => !this.playedToday.has(q.id))
    const available = fresh.length > 0 ? fresh : unused
    if (available.length === 0) return null
    const picked = available[Math.floor(Math.random() * available.length)]
    this.usedIds.add(picked.id)
    return picked
  }

  generateSequence(count: number): Question[] {
    const sequence: Question[] = []
    for (let i = 0; i < count; i++) {
      const q = this.selectNext()
      if (!q) break
      sequence.push(q)
    }
    return sequence
  }

  remaining(): number {
    return this.pool.filter((q) => !this.usedIds.has(q.id)).length
  }
}
