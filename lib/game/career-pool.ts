import type { DifficultyTier } from '@/types/game'

export interface CareerEligibility {
  playerId: number
  seasons: number
  bestPoints: number
  eras: string[]
}

export interface CareerPoolOptions {
  minSeasons: number
  eras?: string[]
  difficultyTiers?: DifficultyTier[]
  excludePlayerIds?: number[]
}

export function getTierForPoints(points: number): DifficultyTier | null {
  if (points >= 140) return 'easy'
  if (points >= 120) return 'medium'
  if (points >= 100) return 'hard'
  if (points >= 70) return 'expert'
  return null
}

/** Eras select players; minimum length and peak scoring use their full career. */
export function selectCareerCandidates(pool: CareerEligibility[], options: CareerPoolOptions): number[] {
  const excluded = new Set(options.excludePlayerIds ?? [])
  return pool.filter((career) => {
    if (excluded.has(career.playerId) || career.seasons < options.minSeasons) return false
    // Omitted filters mean unrestricted; explicit empty selections match nothing.
    if (options.eras && !options.eras.some((era) => career.eras.includes(era))) return false
    if (options.difficultyTiers) {
      const tier = getTierForPoints(career.bestPoints)
      if (!tier || !options.difficultyTiers.includes(tier)) return false
    }
    return true
  }).map((career) => career.playerId)
}
