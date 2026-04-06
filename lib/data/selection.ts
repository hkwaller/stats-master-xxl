import type { DifficultyTier, Question } from '@/types/game'
import { getQuestionsByTiers } from './database'

const ALL_TIERS: DifficultyTier[] = ['easy', 'medium', 'hard', 'expert']

export class QuestionSelector {
  private pool: Question[]
  private preferredTiers: Set<DifficultyTier>
  private usedIds: Set<string>

  constructor(tiers: DifficultyTier[], eras?: string[], excludeIds: string[] = []) {
    const excludeSet = new Set(excludeIds)
    // Pool is ALL tiers so we can fall back when preferred tiers run dry
    this.pool = getQuestionsByTiers(ALL_TIERS, eras).filter((q) => !excludeSet.has(q.id))
    this.preferredTiers = new Set(tiers)
    this.usedIds = new Set(excludeIds)
  }

  selectNext(): Question | null {
    // Try preferred tiers first
    let available = this.pool.filter(
      (q) => !this.usedIds.has(q.id) && this.preferredTiers.has(q.difficulty),
    )
    // Fall back to any remaining tier
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
