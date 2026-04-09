import { NextRequest, NextResponse } from 'next/server'
import { getHLPairs } from '@/lib/data/database'
import type { DifficultyTier, HLComparisonField } from '@/types/game'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      tiers: DifficultyTier[]
      eras?: string[]
      field: HLComparisonField
      count: number
    }

    const pairs = await getHLPairs({
      tiers: body.tiers,
      eras: body.eras,
      field: body.field ?? 'points',
      count: body.count,
    })

    if (pairs.length === 0) {
      return NextResponse.json(
        { error: 'Not enough questions to generate Higher/Lower pairs' },
        { status: 400 },
      )
    }

    // Anchor question per round = the challenge question
    const questions = pairs.map((p) => p.challenge)

    return NextResponse.json({ questions, pairs })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
