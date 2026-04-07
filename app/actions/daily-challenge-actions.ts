'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { createSupabaseClient } from '@/lib/supabase/server';
import { getTodayDateString } from './game-actions';

export type DailyChallengeRecord = {
  challenge_date: string;
  question_id: string;
  is_correct: boolean;
  answered_at: string;
};

export type LeaderboardEntry = {
  userId: string;
  displayName: string;
  answeredAt: string;
};

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

/** Returns all correct answers for today with display names from Clerk. */
export async function getDailyLeaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = createSupabaseClient();
  const today = getTodayDateString();

  const { data, error } = await supabase
    .from('nhl_stats_master_daily_challenge_scores')
    .select('user_id, answered_at')
    .eq('challenge_date', today)
    .eq('is_correct', true)
    .order('answered_at', { ascending: true })
    .limit(20);

  if (error || !data || data.length === 0) {
    if (error) console.error('[daily-challenge] getDailyLeaderboard error:', error);
    return [];
  }

  // Fetch display names from Clerk
  const clerk = await clerkClient();
  const userIds = data.map((row) => row.user_id);
  const { data: clerkUsers } = await clerk.users.getUserList({ userId: userIds });

  const nameMap = new Map(
    clerkUsers.map((u) => [
      u.id,
      u.firstName && u.lastName
        ? `${u.firstName} ${u.lastName}`
        : u.firstName ?? u.username ?? 'Anonymous',
    ])
  );

  return data.map((row) => ({
    userId: row.user_id,
    displayName: nameMap.get(row.user_id) ?? 'Anonymous',
    answeredAt: row.answered_at,
  }));
}
