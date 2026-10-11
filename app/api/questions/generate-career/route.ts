import { NextRequest, NextResponse } from 'next/server'
import { getCareerQuestions, getCareersForPlayers } from '@/lib/data/database'
import type { DifficultyTier } from '@/types/game'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      playerIds?: number[]
      eras?: string[]
      count: number
      minSeasons?: number
      excludePlayerIds?: number[]
      difficultyTiers?: DifficultyTier[]
    }

    if (body.playerIds && (!Array.isArray(body.playerIds) || body.playerIds.length > 50 ||
      body.playerIds.some((id) => !Number.isSafeInteger(id) || id <= 0))) {
      return NextResponse.json({ error: 'Invalid player IDs' }, { status: 400 })
    }
    const careerData = body.playerIds
      ? await getCareersForPlayers([...new Set(body.playerIds)])
      : await getCareerQuestions({
          eras: body.eras,
          count: body.count,
          minSeasons: body.minSeasons ?? 5,
          excludePlayerIds: body.excludePlayerIds ?? [],
          difficultyTiers: body.difficultyTiers,
        })

    // Anchor questions (one per player) for questionSequence - used by the existing state machine
    const questions = careerData.map((c) => c.seasons[0])

    return NextResponse.json({ questions, careerData })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
