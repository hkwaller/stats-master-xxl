import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      roomId: string;
      questionCount: number;
      answerMode: string;
      difficultyTiers: string[];
      revealMode: string;
      players: { name: string; score: number; avatarUrl: string }[];
      winnerName: string;
      winnerScore: number;
    };

    const supabase = createSupabaseClient();
    const { error } = await supabase
      .from("nhl_stats_master_game_results")
      .insert({
        room_id: body.roomId,
        question_count: body.questionCount,
        answer_mode: body.answerMode,
        difficulty_tiers: body.difficultyTiers,
        reveal_mode: body.revealMode,
        players: body.players,
        winner_name: body.winnerName,
        winner_score: body.winnerScore,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
