import { describe, expect, it, vi } from 'vitest'
import type { DifficultyTier, Question } from '../../types/game'

const POINTS: Record<DifficultyTier, number> = { easy: 150, medium: 130, hard: 110, expert: 80 }
function season(id: number, difficulty: DifficultyTier): Question {
  return { id: String(id), difficulty, points: POINTS[difficulty] } as Question
}

// 3 easy seasons among plenty of others; the DB layer is server-only, so stub it.
const ALL = [
  season(1, 'easy'), season(2, 'easy'), season(3, 'easy'),
  ...Array.from({ length: 20 }, (_, i) => season(100 + i, 'medium')),
  ...Array.from({ length: 20 }, (_, i) => season(200 + i, 'expert')),
]
vi.mock('./database', () => ({
  getQuestionsByTiers: vi.fn(async (tiers: DifficultyTier[]) => ALL.filter((q) => tiers.includes(q.difficulty))),
}))

const { QuestionSelector } = await import('./selection')

describe('QuestionSelector difficulty tiers', () => {
  it('never deals a tier the host switched off, even when today’s fresh seasons run out', async () => {
    for (let run = 0; run < 50; run++) {
      // Two of three easy seasons were already played on this device today.
      const selector = await QuestionSelector.create(['easy'], undefined, ['1', '2'])
      const dealt = selector.generateSequence(3)
      expect(dealt.map((q) => q.difficulty)).toEqual(['easy', 'easy', 'easy'])
      // The unplayed season comes first; repeats from earlier today only fill in after.
      expect(dealt[0].id).toBe('3')
      expect(new Set(dealt.map((q) => q.id)).size).toBe(3)
    }
  })

  it('prefers seasons not yet played today', async () => {
    const selector = await QuestionSelector.create(['easy', 'medium'], undefined, ['1', '2', '3'])
    const dealt = selector.generateSequence(10)
    expect(dealt).toHaveLength(10)
    expect(dealt.every((q) => q.difficulty === 'medium')).toBe(true)
  })

  it('deals fewer cards rather than leave the chosen tiers', async () => {
    const selector = await QuestionSelector.create(['easy'])
    expect(selector.generateSequence(5).map((q) => q.difficulty)).toEqual(['easy', 'easy', 'easy'])
  })
})
