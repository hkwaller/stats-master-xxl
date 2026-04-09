'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { createSupabaseClient } from '@/lib/supabase/server';
import { getTodayDateString } from './game-actions';

export type LeaderboardPeriod = 'today' | 'week' | 'month' | 'ytd' | 'all';

export type DailyChallengeRecord = {
  challenge_date: string;
  question_id: string;
  is_correct: boolean;
  answered_at: string;
};

export type LeaderboardEntry = {
  userId: string;
  displayName: string;
  /** Populated for the 'today' period — time of the correct answer. */
  answeredAt?: string;
  /** Populated for all other periods — number of correct answers. */
  correctCount?: number;
};

function getPeriodStartDate(period: LeaderboardPeriod): string | null {
  const now = new Date();
  if (period === 'today') return now.toISOString().slice(0, 10);
  if (period === 'week') {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - 6);
    return d.toISOString().slice(0, 10);
  }
  if (period === 'month') {
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  }
  if (period === 'ytd') {
    return `${now.getUTCFullYear()}-01-01`;
  }
  return null;
}

function buildNameMap(clerkUsers: Awaited<ReturnType<Awaited<ReturnType<typeof clerkClient>>['users']['getUserList']>>['data']) {
  return new Map(
    clerkUsers.map((u) => [
      u.id,
      u.firstName && u.lastName
        ? `${u.firstName} ${u.lastName}`
        : u.firstName ?? u.username ?? 'Anonymous',
    ])
  );
}

/** Returns the signed-in user's answer for today, or null if not answered / not signed in. */
export async function getMyDailyChallengeScore(): Promise<DailyChallengeRecord | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = createSupabaseClient();
  const today = getTodayDateString();

  const { data, error } = await supabase
    .from('nhl_stats_master_daily_challenge_scores')
    .select('challenge_date, question_id, is_correct, answered_at')
    .eq('user_id', userId)
    .eq('challenge_date', today)
    .maybeSingle();

  if (error) {
    console.error('[daily-challenge] getMyDailyChallengeScore error:', error);
    return null;
  }

  return data;
}

/** Saves the user's answer. Idempotent — duplicate submissions for the same day are ignored. */
export async function saveDailyChallengeScore(params: {
  questionId: string;
  isCorrect: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: 'not_authenticated' };

  const supabase = createSupabaseClient();
  const today = getTodayDateString();

  const { error } = await supabase
    .from('nhl_stats_master_daily_challenge_scores')
    .upsert(
      {
        user_id: userId,
        challenge_date: today,
        question_id: params.questionId,
        is_correct: params.isCorrect,
        answered_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,challenge_date', ignoreDuplicates: true }
    );

  if (error) {
    console.error('[daily-challenge] saveDailyChallengeScore error:', error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/**
 * Returns the leaderboard for a given period.
 *
 * - 'today': top 10 correct answers for today, ordered by time (first correct wins).
 * - 'week' | 'month' | 'ytd' | 'all': top 10 by total correct answers in the period.
 */
export async function getDailyLeaderboard(period: LeaderboardPeriod = 'today'): Promise<LeaderboardEntry[]> {
  const supabase = createSupabaseClient();
  const startDate = getPeriodStartDate(period);

  if (period === 'today') {
    const { data, error } = await supabase
      .from('nhl_stats_master_daily_challenge_scores')
      .select('user_id, answered_at')
      .eq('challenge_date', startDate!)
      .eq('is_correct', true)
      .order('answered_at', { ascending: true })
      .limit(10);

    if (error || !data || data.length === 0) {
      if (error) console.error('[daily-challenge] getDailyLeaderboard error:', error);
      return [];
    }

    const clerk = await clerkClient();
    const { data: clerkUsers } = await clerk.users.getUserList({ userId: data.map((r) => r.user_id) });
    const nameMap = buildNameMap(clerkUsers);

    return data.map((row) => ({
      userId: row.user_id,
      displayName: nameMap.get(row.user_id) ?? 'Anonymous',
      answeredAt: row.answered_at,
    }));
  }

  // Aggregate correct-answer counts across the period
  let query = supabase
    .from('nhl_stats_master_daily_challenge_scores')
    .select('user_id')
    .eq('is_correct', true);

  if (startDate) {
    query = query.gte('challenge_date', startDate);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    if (error) console.error('[daily-challenge] getDailyLeaderboard error:', error);
    return [];
  }

  const counts = new Map<string, number>();
  for (const row of data) {
    counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
  }

  const top10 = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const clerk = await clerkClient();
  const { data: clerkUsers } = await clerk.users.getUserList({ userId: top10.map(([id]) => id) });
  const nameMap = buildNameMap(clerkUsers);

  return top10.map(([userId, count]) => ({
    userId,
    displayName: nameMap.get(userId) ?? 'Anonymous',
    correctCount: count,
  }));
}
