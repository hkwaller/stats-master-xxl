import { NextRequest, NextResponse } from 'next/server'
import { getH2HPairs } from '@/lib/data/database'
import type { DifficultyTier } from '@/types/game'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      tiers: DifficultyTier[]
      eras?: string[]
      count: number
    }

    const pairs = await getH2HPairs({
      tiers: body.tiers,
      eras: body.eras,
      count: body.count,
    })

    if (pairs.length === 0) {
      return NextResponse.json(
        { error: 'Not enough players to generate H2H pairs' },
        { status: 400 },
      )
    }

    // Anchor question per round = the target question (the one players are guessing)
    const questions = pairs.map((p) =>
      p.correctSide === 'left' ? p.left : p.right,
    )

    return NextResponse.json({ questions, pairs })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
