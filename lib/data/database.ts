import "server-only";

import { stats } from "@/scores";
import type { DifficultyTier, Question, RawStatsRecord } from "@/types/game";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSeason(seasonId: number): string {
  const s = String(seasonId);
  return `${s.slice(0, 4)}-${s.slice(6, 8)}`;
}

function getEra(seasonId: number): string {
  const year = Math.floor(Number(String(seasonId).slice(0, 4)) / 10) * 10;
  return `${year}s`;
}

export function getTierForPoints(points: number): DifficultyTier | null {
  if (points >= 140) return "easy";
  if (points >= 120) return "medium";
  if (points >= 100) return "hard";
  if (points >= 70) return "expert";
  return null;
}

function mapRecord(r: RawStatsRecord): Question {
  return {
    id: String(r.id),
    playerId: r.playerId,
    firstName: r.firstName,
    lastName: r.lastName,
    seasonId: r.seasonId,
    season: formatSeason(r.seasonId),
    era: getEra(r.seasonId),
    positionCode: r.positionCode,
    teamAbbrevs: r.teamAbbrevs,
    teamNames: r.teamNames,
    points: r.points,
    gamesPlayed: r.gamesPlayed,
    goals: r.goals,
    assists: r.assists,
    penaltyMinutes: r.penaltyMinutes,
    difficulty: getTierForPoints(r.points)!,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getQuestionsByTiers(tiers: DifficultyTier[], eras?: string[]): Question[] {
  const tierSet = new Set(tiers);
  const eraSet = eras ? new Set(eras) : null;
  return (stats as RawStatsRecord[])
    .filter((r) => {
      const tier = getTierForPoints(r.points);
      if (tier === null || !tierSet.has(tier)) return false;
      if (eraSet) {
        const era = getEra(r.seasonId);
        if (!eraSet.has(era)) return false;
      }
      return true;
    })
    .map(mapRecord);
}

export function getQuestionById(id: string): Question | undefined {
  const r = (stats as RawStatsRecord[]).find((r) => String(r.id) === id);
  return r ? mapRecord(r) : undefined;
}

/** Returns unique player names for a given set of tiers (for typeahead search) */
export function getPlayerNamesByTiers(tiers: DifficultyTier[]): string[] {
  const seen = new Set<number>();
  const names: string[] = [];
  for (const r of stats as RawStatsRecord[]) {
    const tier = getTierForPoints(r.points);
    if (!tier || !tiers.includes(tier)) continue;
    if (seen.has(r.playerId)) continue;
    seen.add(r.playerId);
    names.push(`${r.firstName} ${r.lastName}`);
  }
  return names.sort();
}

/** Count of available questions per tier */
export function getQuestionCounts(): Record<DifficultyTier, number> {
  const counts: Record<DifficultyTier, number> = {
    easy: 0,
    medium: 0,
    hard: 0,
    expert: 0,
  };
  for (const r of stats as RawStatsRecord[]) {
    const tier = getTierForPoints(r.points);
    if (tier) counts[tier]++;
  }
  return counts;
}

export function getAvailableQuestionCount(tiers: DifficultyTier[], eras: string[]): number {
  const tierSet = new Set(tiers);
  const eraSet = new Set(eras);
  let count = 0;
  for (const r of stats as RawStatsRecord[]) {
    const tier = getTierForPoints(r.points);
    if (tier === null || !tierSet.has(tier)) continue;
    const era = getEra(r.seasonId);
    if (!eraSet.has(era)) continue;
    count++;
  }
  return count;
}
