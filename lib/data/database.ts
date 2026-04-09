import "server-only";

import { createSupabaseClient } from "@/lib/supabase/server";
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

// ─── DB row type (snake_case from Supabase) ───────────────────────────────────

type DbRow = {
  id: number;
  player_id: number;
  first_name: string;
  last_name: string;
  season_id: number;
  position_code: string;
  team_abbrevs: string;
  team_names: string;
  games_played: number;
  goals: number;
  assists: number;
  points: number;
  penalty_minutes: number;
  active_player: boolean;
  rookie_flag: boolean;
  era: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const TIER_RANGES: Record<DifficultyTier, [number, number]> = {
  easy: [140, 9999],
  medium: [120, 139],
  hard: [100, 119],
  expert: [70, 99],
};

function dbToRaw(r: DbRow): RawStatsRecord {
  return {
    id: r.id,
    playerId: r.player_id,
    firstName: r.first_name,
    lastName: r.last_name,
    seasonId: r.season_id,
    positionCode: r.position_code,
    teamAbbrevs: r.team_abbrevs,
    teamNames: r.team_names,
    gamesPlayed: r.games_played,
    goals: r.goals,
    assists: r.assists,
    points: r.points,
    penaltyMinutes: r.penalty_minutes,
    activePlayer: r.active_player,
    rookieFlag: r.rookie_flag,
  };
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

export async function getQuestionsByTiers(
  tiers: DifficultyTier[],
  eras?: string[],
  rookiesOnly?: boolean,
): Promise<Question[]> {
  if (tiers.length === 0) return [];

  const tierSet = new Set(tiers);
  const ranges = tiers.map((t) => TIER_RANGES[t]);
  const minPts = Math.min(...ranges.map((r) => r[0]));
  const maxPts = Math.max(...ranges.map((r) => r[1]));

  const db = createSupabaseClient();
  let query = db
    .from("nhl_player_seasons")
    .select("*")
    .gte("points", minPts);

  if (maxPts < 9999) query = query.lte("points", maxPts);
  if (eras?.length) query = query.in("era", eras);
  if (rookiesOnly) query = query.eq("rookie_flag", true);

  const { data, error } = await query;
  if (error) throw new Error(`getQuestionsByTiers: ${error.message}`);

  // Final filter for non-contiguous tier selections, then map
  return (data as DbRow[])
    .filter((r) => {
      const tier = getTierForPoints(r.points);
      return tier !== null && tierSet.has(tier);
    })
    .map((r) => mapRecord(dbToRaw(r)));
}

export async function getQuestionById(id: string): Promise<Question | undefined> {
  const db = createSupabaseClient();
  const { data, error } = await db
    .from("nhl_player_seasons")
    .select("*")
    .eq("id", Number(id))
    .single();

  if (error || !data) return undefined;
  return mapRecord(dbToRaw(data as DbRow));
}

/** Unique player names for typeahead search — filtered by difficulty tier */
export async function getPlayerNamesByTiers(
  tiers: DifficultyTier[],
): Promise<string[]> {
  if (tiers.length === 0) return [];

  const ranges = tiers.map((t) => TIER_RANGES[t]);
  const minPts = Math.min(...ranges.map((r) => r[0]));
  const maxPts = Math.max(...ranges.map((r) => r[1]));

  const db = createSupabaseClient();
  const PAGE_SIZE = 1000;
  const tierSet = new Set(tiers);
  const seen = new Set<number>();
  const names: string[] = [];
  let from = 0;

  while (true) {
    let query = db
      .from("nhl_player_seasons")
      .select("player_id, first_name, last_name, points")
      .gte("points", minPts)
      .range(from, from + PAGE_SIZE - 1)
      .order("player_id");
    if (maxPts < 9999) query = query.lte("points", maxPts);

    const { data, error } = await query;
    if (error) throw new Error(`getPlayerNamesByTiers: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const r of data as Pick<DbRow, "player_id" | "first_name" | "last_name" | "points">[]) {
      const tier = getTierForPoints(r.points);
      if (!tier || !tierSet.has(tier)) continue;
      if (seen.has(r.player_id)) continue;
      seen.add(r.player_id);
      names.push(`${r.first_name} ${r.last_name}`);
    }

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return names.sort();
}

/** Count of available questions per tier */
export async function getQuestionCounts(): Promise<Record<DifficultyTier, number>> {
  const db = createSupabaseClient();
  const { data, error } = await db
    .from("nhl_player_seasons")
    .select("points")
    .gte("points", 70);

  if (error) throw new Error(`getQuestionCounts: ${error.message}`);

  const counts: Record<DifficultyTier, number> = {
    easy: 0, medium: 0, hard: 0, expert: 0,
  };
  for (const r of data as Pick<DbRow, "points">[]) {
    const tier = getTierForPoints(r.points);
    if (tier) counts[tier]++;
  }
  return counts;
}

export async function getAvailableQuestionCount(
  tiers: DifficultyTier[],
  eras: string[],
  rookiesOnly?: boolean,
): Promise<number> {
  if (tiers.length === 0 || eras.length === 0) return 0;

  const ranges = tiers.map((t) => TIER_RANGES[t]);
  const minPts = Math.min(...ranges.map((r) => r[0]));
  const maxPts = Math.max(...ranges.map((r) => r[1]));
  const tierSet = new Set(tiers);

  const db = createSupabaseClient();
  let query = db
    .from("nhl_player_seasons")
    .select("points", { count: "exact", head: false })
    .gte("points", minPts)
    .in("era", eras);

  if (maxPts < 9999) query = query.lte("points", maxPts);
  if (rookiesOnly) query = query.eq("rookie_flag", true);

  const { data, error } = await query;
  if (error) throw new Error(`getAvailableQuestionCount: ${error.message}`);

  // Count only exact tier matches (for non-contiguous selections)
  return (data as Pick<DbRow, "points">[]).filter((r) => {
    const tier = getTierForPoints(r.points);
    return tier !== null && tierSet.has(tier);
  }).length;
}

// ─── Career Mode ──────────────────────────────────────────────────────────────

function selectCareerSeasons(
  seasons: RawStatsRecord[],
  maxReveals: number,
): RawStatsRecord[] {
  if (seasons.length <= maxReveals) return [...seasons];

  const byPoints = [...seasons].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  const mustInclude = new Set<number>([
    byPoints[0].id,
    byPoints[byPoints.length - 1].id,
  ]);

  const rookie = seasons.find((s) => s.rookieFlag);
  if (rookie) mustInclude.add(rookie.id);

  const chrono = [...seasons].sort((a, b) => a.seasonId - b.seasonId);
  let prevTeam = "";
  for (const s of chrono) {
    if (prevTeam && s.teamAbbrevs !== prevTeam && mustInclude.size < maxReveals) {
      mustInclude.add(s.id);
    }
    prevTeam = s.teamAbbrevs;
  }

  const selected = seasons.filter((s) => mustInclude.has(s.id));
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

export async function getCareerQuestions(options: {
  minSeasons: number;
  maxReveals: number;
  revealOrder: CareerRevealOrder;
  eras?: string[];
  count: number;
  excludePlayerIds?: number[];
  difficultyTiers?: DifficultyTier[];
}): Promise<CareerQuestion[]> {
  const db = createSupabaseClient();

  // Fetch all seasons matching the era filter in one query
  let query = db.from("nhl_player_seasons").select("*");
  if (options.eras?.length) query = query.in("era", options.eras);
  if (options.excludePlayerIds?.length) {
    query = query.not(
      "player_id",
      "in",
      `(${options.excludePlayerIds.join(",")})`,
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(`getCareerQuestions: ${error.message}`);

  const tierSet = options.difficultyTiers?.length
    ? new Set(options.difficultyTiers)
    : null;

  // Group by player in JS
  const byPlayer = new Map<number, RawStatsRecord[]>();
  for (const row of data as DbRow[]) {
    const r = dbToRaw(row);
    const existing = byPlayer.get(r.playerId) ?? [];
    existing.push(r);
    byPlayer.set(r.playerId, existing);
  }

  const candidates: CareerQuestion[] = [];
  for (const [, seasons] of byPlayer) {
    if (seasons.length < options.minSeasons) continue;

    // Filter by best season tier when difficultyTiers is specified
    if (tierSet) {
      const bestPoints = Math.max(...seasons.map((s) => s.points ?? 0));
      const bestTier = getTierForPoints(bestPoints);
      if (!bestTier || !tierSet.has(bestTier)) continue;
    }

    const selected = selectCareerSeasons(seasons, options.maxReveals);
    const ordered = orderSeasons(selected, options.revealOrder);
    const totalCareerPoints = seasons.reduce(
      (sum, s) => sum + (s.points ?? 0),
      0,
    );
    const first = seasons[0];

    candidates.push({
      playerId: first.playerId,
      firstName: first.firstName,
      lastName: first.lastName,
      totalCareerPoints,
      seasons: ordered.map(mapRecord),
    });
  }

  candidates.sort(() => Math.random() - 0.5);
  return candidates.slice(0, options.count);
}

/** Count of players eligible for career mode */
export async function getCareerPlayerCount(options: {
  minSeasons: number;
  eras?: string[];
  difficultyTiers?: DifficultyTier[];
}): Promise<number> {
  const db = createSupabaseClient();
  let query = db
    .from("nhl_player_seasons")
    .select("player_id, points");
  if (options.eras?.length) query = query.in("era", options.eras);

  const { data, error } = await query;
  if (error) throw new Error(`getCareerPlayerCount: ${error.message}`);

  const tierSet = options.difficultyTiers?.length
    ? new Set(options.difficultyTiers)
    : null;

  // Group seasons by player to check minSeasons and best-season tier
  const byPlayer = new Map<number, number[]>();
  for (const r of data as Pick<DbRow, "player_id" | "points">[]) {
    const pts = byPlayer.get(r.player_id) ?? [];
    pts.push(r.points);
    byPlayer.set(r.player_id, pts);
  }

  let count = 0;
  for (const pts of byPlayer.values()) {
    if (pts.length < options.minSeasons) continue;
    if (tierSet) {
      const bestTier = getTierForPoints(Math.max(...pts));
      if (!bestTier || !tierSet.has(bestTier)) continue;
    }
    count++;
  }
  return count;
}

// ─── Head-to-Head Mode ────────────────────────────────────────────────────────

export async function getH2HPairs(options: {
  tiers: DifficultyTier[];
  eras?: string[];
  count: number;
}): Promise<H2HPair[]> {
  const pool = await getQuestionsByTiers(options.tiers, options.eras);

  const buckets = new Map<string, Question[]>();
  for (const q of pool) {
    const key = `${q.era}-${Math.floor(q.points / 20)}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(q);
    buckets.set(key, bucket);
  }

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

export async function getHLPairs(options: {
  tiers: DifficultyTier[];
  eras?: string[];
  field: HLComparisonField;
  count: number;
}): Promise<HLPair[]> {
  const pool = await getQuestionsByTiers(options.tiers, options.eras);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);

  const pairs: HLPair[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < shuffled.length && pairs.length < options.count; i++) {
    const reference = shuffled[i];
    if (usedIds.has(reference.id)) continue;

    const challenge = shuffled.find(
      (q, j) =>
        j !== i && !usedIds.has(q.id) && q.playerId !== reference.playerId,
    );
    if (!challenge) continue;

    const refValue = reference[options.field as keyof Question] as number;
    const chalValue = challenge[options.field as keyof Question] as number;

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
