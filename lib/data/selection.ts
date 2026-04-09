import type { DifficultyTier, Question } from '@/types/game'
import { getQuestionsByTiers } from './database'

const ALL_TIERS: DifficultyTier[] = ['easy', 'medium', 'hard', 'expert']

export class QuestionSelector {
  private pool: Question[]
  private preferredTiers: Set<DifficultyTier>
  private usedIds: Set<string>

  private constructor(pool: Question[], tiers: DifficultyTier[], excludeIds: string[]) {
    this.pool = pool
    this.preferredTiers = new Set(tiers)
    this.usedIds = new Set(excludeIds)
  }

  /** Factory — use instead of `new QuestionSelector(...)` */
  static async create(
    tiers: DifficultyTier[],
    eras?: string[],
    excludeIds: string[] = [],
    rookiesOnly?: boolean,
  ): Promise<QuestionSelector> {
    const excludeSet = new Set(excludeIds)
    const pool = (await getQuestionsByTiers(ALL_TIERS, eras, rookiesOnly)).filter(
      (q) => !excludeSet.has(q.id),
    )
    return new QuestionSelector(pool, tiers, excludeIds)
  }

  selectNext(): Question | null {
    let available = this.pool.filter(
      (q) => !this.usedIds.has(q.id) && this.preferredTiers.has(q.difficulty),
    )
    if (available.length === 0) {
      available = this.pool.filter((q) => !this.usedIds.has(q.id))
    }
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
