import "server-only";

import { stats } from "@/scores";
import type {
  CareerQuestion,
  CareerRevealOrder,
  DifficultyTier,
  H2HPair,
  HLComparisonField,
  HLPair,
  Question,
  RawStatsRecord,
} from "@/types/game";

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

// ─── Public API — Classic ─────────────────────────────────────────────────────

export function getQuestionsByTiers(
  tiers: DifficultyTier[],
  eras?: string[],
  rookiesOnly?: boolean,
): Question[] {
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
      if (rookiesOnly && !r.rookieFlag) return false;
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

export function getAvailableQuestionCount(
  tiers: DifficultyTier[],
  eras: string[],
  rookiesOnly?: boolean,
): number {
  const tierSet = new Set(tiers);
  const eraSet = new Set(eras);
  let count = 0;
  for (const r of stats as RawStatsRecord[]) {
    const tier = getTierForPoints(r.points);
    if (tier === null || !tierSet.has(tier)) continue;
    const era = getEra(r.seasonId);
    if (!eraSet.has(era)) continue;
    if (rookiesOnly && !r.rookieFlag) continue;
    count++;
  }
  return count;
}

// ─── Career Mode ──────────────────────────────────────────────────────────────

function selectCareerSeasons(
  seasons: RawStatsRecord[],
  maxReveals: number,
): RawStatsRecord[] {
  if (seasons.length <= maxReveals) return [...seasons];

  // Build a priority set: best season, worst season, rookie season, team-change seasons
  const byPoints = [...seasons].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  const mustInclude = new Set<number>([byPoints[0].id, byPoints[byPoints.length - 1].id]);

  const rookie = seasons.find((s) => s.rookieFlag);
  if (rookie) mustInclude.add(rookie.id);

  // Detect team changes (chronological order)
  const chrono = [...seasons].sort((a, b) => a.seasonId - b.seasonId);
  let prevTeam = "";
  for (const s of chrono) {
    if (prevTeam && s.teamAbbrevs !== prevTeam && mustInclude.size < maxReveals) {
      mustInclude.add(s.id);
    }
    prevTeam = s.teamAbbrevs;
  }

  const selected = seasons.filter((s) => mustInclude.has(s.id));

  // Fill remaining slots with highest-point seasons not yet selected
  const remaining = byPoints.filter((s) => !mustInclude.has(s.id));
  for (const s of remaining) {
    if (selected.length >= maxReveals) break;
    selected.push(s);
  }

  return selected;
}

function orderSeasons(
  seasons: RawStatsRecord[],
  order: CareerRevealOrder,
): RawStatsRecord[] {
  const copy = [...seasons];
  switch (order) {
    case "best-first":
      return copy.sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
    case "worst-first":
      return copy.sort((a, b) => (a.points ?? 0) - (b.points ?? 0));
    case "chronological":
      return copy.sort((a, b) => a.seasonId - b.seasonId);
    case "random":
      return copy.sort(() => Math.random() - 0.5);
    default:
      return copy;
  }
}

export function getCareerQuestions(options: {
  minSeasons: number;
  maxReveals: number;
  revealOrder: CareerRevealOrder;
  eras?: string[];
  count: number;
  excludePlayerIds?: number[];
}): CareerQuestion[] {
  const eraSet = options.eras ? new Set(options.eras) : null;
  const excludeSet = new Set(options.excludePlayerIds ?? []);

  // Group stats by playerId, filtered by era
  const byPlayer = new Map<number, RawStatsRecord[]>();
  for (const r of stats as RawStatsRecord[]) {
    if (excludeSet.has(r.playerId)) continue;
    if (eraSet && !eraSet.has(getEra(r.seasonId))) continue;
    const existing = byPlayer.get(r.playerId) ?? [];
    existing.push(r);
    byPlayer.set(r.playerId, existing);
  }

  const candidates: CareerQuestion[] = [];
  for (const [, seasons] of byPlayer) {
    if (seasons.length < options.minSeasons) continue;

    const selected = selectCareerSeasons(seasons, options.maxReveals);
    const ordered = orderSeasons(selected, options.revealOrder);

    const totalCareerPoints = seasons.reduce((sum, s) => sum + (s.points ?? 0), 0);
    const first = seasons[0];

    candidates.push({
      playerId: first.playerId,
      firstName: first.firstName,
      lastName: first.lastName,
      totalCareerPoints,
      seasons: ordered.map(mapRecord),
    });
  }

  // Shuffle and return requested count
  candidates.sort(() => Math.random() - 0.5);
  return candidates.slice(0, options.count);
}

/** Count of players eligible for career mode with the given settings */
export function getCareerPlayerCount(options: {
  minSeasons: number;
  eras?: string[];
}): number {
  const eraSet = options.eras ? new Set(options.eras) : null;
  const byPlayer = new Map<number, number>();

  for (const r of stats as RawStatsRecord[]) {
    if (eraSet && !eraSet.has(getEra(r.seasonId))) continue;
    byPlayer.set(r.playerId, (byPlayer.get(r.playerId) ?? 0) + 1);
  }

  let count = 0;
  for (const [, n] of byPlayer) {
    if (n >= options.minSeasons) count++;
  }
  return count;
}

// ─── Head-to-Head Mode ────────────────────────────────────────────────────────

export function getH2HPairs(options: {
  tiers: DifficultyTier[];
  eras?: string[];
  count: number;
}): H2HPair[] {
  const pool = getQuestionsByTiers(options.tiers, options.eras);

  // Group by era + 20-point bucket for matched pairs
  const buckets = new Map<string, Question[]>();
  for (const q of pool) {
    const key = `${q.era}-${Math.floor(q.points / 20)}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(q);
    buckets.set(key, bucket);
  }

  // Only buckets with 2+ distinct players
  const validBuckets = [...buckets.values()].filter((questions) => {
    const unique = new Set(questions.map((q) => q.playerId));
    return unique.size >= 2;
  });

  const pairs: H2HPair[] = [];
  const usedIds = new Set<string>();

  let attempts = 0;
  while (pairs.length < options.count && attempts < options.count * 10) {
    attempts++;
    const bucket = validBuckets[Math.floor(Math.random() * validBuckets.length)];
    if (!bucket) continue;

    const available = bucket.filter((q) => !usedIds.has(q.id));
    const uniquePlayers = new Set(available.map((q) => q.playerId));
    if (uniquePlayers.size < 2) continue;

    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const left = shuffled[0];
    const right = shuffled.find((q) => q.playerId !== left.playerId);
    if (!left || !right) continue;

    usedIds.add(left.id);
    usedIds.add(right.id);

    const correctSide: "left" | "right" = Math.random() < 0.5 ? "left" : "right";
    const targetQ = correctSide === "left" ? left : right;

    pairs.push({
      left,
      right,
      targetName: `${targetQ.firstName} ${targetQ.lastName}`,
      correctSide,
    });
  }

  return pairs;
}

// ─── Higher/Lower Mode ────────────────────────────────────────────────────────

export function getHLPairs(options: {
  tiers: DifficultyTier[];
  eras?: string[];
  field: HLComparisonField;
  count: number;
}): HLPair[] {
  const pool = getQuestionsByTiers(options.tiers, options.eras);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);

  const pairs: HLPair[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < shuffled.length && pairs.length < options.count; i++) {
    const reference = shuffled[i];
    if (usedIds.has(reference.id)) continue;

    const challenge = shuffled.find(
      (q, j) =>
        j !== i &&
        !usedIds.has(q.id) &&
        q.playerId !== reference.playerId,
    );
    if (!challenge) continue;

    const refValue = reference[options.field as keyof Question] as number;
    const chalValue = challenge[options.field as keyof Question] as number;

    // Skip ties — they make for bad questions
    if (refValue === chalValue) continue;

    usedIds.add(reference.id);
    usedIds.add(challenge.id);

    pairs.push({
      reference,
      challenge,
      field: options.field,
      referenceValue: refValue,
      challengeValue: chalValue,
      correctAnswer: chalValue > refValue ? "higher" : "lower",
    });
  }

  return pairs;
}
