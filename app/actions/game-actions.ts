"use server";

import {
  getAvailableQuestionCount,
  getCareerPlayerCount,
  getQuestionsByTiers,
} from "@/lib/data/database";
import { generateChoices } from "@/lib/data/choices";
import type { DifficultyTier, Question } from "@/types/game";

export async function checkAvailableCount(
  tiers: DifficultyTier[],
  eras: string[],
  rookiesOnly?: boolean,
) {
  if (tiers.length === 0 || eras.length === 0) return 0;
  return await getAvailableQuestionCount(tiers, eras, rookiesOnly);
}

export async function checkCareerPlayerCount(
  minSeasons: number,
  eras: string[],
  difficultyTiers?: DifficultyTier[],
) {
  if (eras.length === 0) return 0;
  return await getCareerPlayerCount({ minSeasons, eras, difficultyTiers });
}

/** Returns today's date as a UTC string, e.g. "2026-04-06". Used as the localStorage and DB key. */
export async function getTodayDateString(): Promise<string> {
  return new Date().toISOString().slice(0, 10);
}

/** Returns the same question for every user on the same UTC day. No repeats for 16+ years. */
export async function getDailyChallenge(): Promise<Question | null> {
  const pool = await getQuestionsByTiers(["easy", "medium", "hard", "expert"]);
  if (pool.length === 0) return null;

  // Sort by numeric ID for a stable, deterministic ordering
  pool.sort((a, b) => Number(a.id) - Number(b.id));

  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const selected = pool[dayIndex % pool.length];

  // Pass dayIndex as seed so choices are identical for every user all day
  selected.choices = generateChoices(selected, pool, dayIndex);

  return selected;
}
