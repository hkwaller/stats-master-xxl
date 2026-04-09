import { NextRequest, NextResponse } from 'next/server'
import { getCareerQuestions } from '@/lib/data/database'
import type { CareerRevealOrder, DifficultyTier } from '@/types/game'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      eras?: string[]
      count: number
      minSeasons?: number
      maxReveals?: number
      revealOrder?: CareerRevealOrder
      excludePlayerIds?: number[]
      difficultyTiers?: DifficultyTier[]
    }

    const careerData = await getCareerQuestions({
      eras: body.eras,
      count: body.count,
      minSeasons: body.minSeasons ?? 5,
      maxReveals: body.maxReveals ?? 8,
      revealOrder: body.revealOrder ?? 'best-first',
      excludePlayerIds: body.excludePlayerIds ?? [],
      difficultyTiers: body.difficultyTiers,
    })

    // Anchor questions (one per player) for questionSequence — used by the existing state machine
    const questions = careerData.map((c) => c.seasons[0])

    return NextResponse.json({ questions, careerData })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
