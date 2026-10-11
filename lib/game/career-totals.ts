import type { Question } from '@/types/game'

export function careerTotals(seasons: Question[]) {
  const unique = new Map(seasons.map((season) => [season.seasonId, season]))
  const totals = { seasons: unique.size, gamesPlayed: 0, goals: 0, assists: 0, points: 0, penaltyMinutes: 0 }
  for (const season of unique.values()) {
    totals.gamesPlayed += season.gamesPlayed
    totals.goals += season.goals
    totals.assists += season.assists
    totals.points += season.points
    totals.penaltyMinutes += season.penaltyMinutes
  }
  return totals
}
