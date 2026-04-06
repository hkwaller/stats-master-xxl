'use server';

import { getAvailableQuestionCount } from '@/lib/data/database';
import type { DifficultyTier } from '@/types/game';

export async function checkAvailableCount(tiers: DifficultyTier[], eras: string[]) {
  if (tiers.length === 0 || eras.length === 0) return 0;
  return getAvailableQuestionCount(tiers, eras);
}
