import { NextRequest, NextResponse } from 'next/server'
import Fuse from 'fuse.js'
import rawPlayers from '@/lib/data/player-names.json'

type PlayerEntry = { name: string; pts: number }

const players = rawPlayers as PlayerEntry[]

// Normalise career points to [0, 1] so they can be blended with Fuse scores.
// Fuse score: 0 = perfect match, 1 = no match.
// pointsScore: 0 = most career points, 1 = fewest — same direction.
const maxPts = Math.max(...players.map((p) => p.pts))
const playersWithRank = players.map((p) => ({
  ...p,
  pointsScore: 1 - p.pts / maxPts,
}))

const fuse = new Fuse(playersWithRank, {
  keys: ['name'],
  threshold: 0.35,
  distance: 200,
  minMatchCharLength: 2,
  includeScore: true,
})

export async function GET(req: NextRequest) {
  const query = (new URL(req.url).searchParams.get('q') ?? '').trim()

  if (query.length < 2) {
    return NextResponse.json({ names: [] })
  }

  const names = fuse
    .search(query)
    .map((r) => ({
      name: r.item.name,
      // 60% fuzzy relevance, 40% career points — keeps exact matches first
      // but bubbles up famous players when scores are close
      combined: (r.score ?? 0) * 0.6 + r.item.pointsScore * 0.4,
    }))
    .sort((a, b) => a.combined - b.combined)
    .map((r) => r.name)
    .slice(0, 8)

  return NextResponse.json({ names })
}
