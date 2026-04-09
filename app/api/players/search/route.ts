import { NextRequest, NextResponse } from 'next/server'
import { getPlayerNamesByTiers } from '@/lib/data/database'
import type { DifficultyTier } from '@/types/game'

const ALL_TIERS: DifficultyTier[] = ['easy', 'medium', 'hard', 'expert']

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = (searchParams.get('q') ?? '').toLowerCase().trim()
  const tiersParam = searchParams.get('tiers')
  const tiers = tiersParam
    ? (tiersParam.split(',') as DifficultyTier[])
    : ALL_TIERS

  if (query.length < 2) {
    return NextResponse.json({ names: [] })
  }

  const allNames = await getPlayerNamesByTiers(tiers)
  const matches = allNames.filter((name) => name.toLowerCase().includes(query))

  return NextResponse.json({ names: matches.slice(0, 10) })
}
