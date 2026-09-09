'use client'

import type { Question } from '@/types/game'
import { Jumbotron, type JumboCell, type JumboSize } from '@/components/arcade'

interface StatsCardProps {
  question: Question
  /** 0 = none revealed, 5 = all. Cells illuminate left to right. */
  revealedColumns: number
  size?: JumboSize
  /** Amber chip half-outside the bottom-right corner. */
  caption?: string
  className?: string
}

const COLUMNS: { key: keyof Question; abbr: string; emphasis: boolean }[] = [
  { key: 'gamesPlayed', abbr: 'GP', emphasis: false },
  { key: 'goals', abbr: 'G', emphasis: false },
  { key: 'assists', abbr: 'A', emphasis: false },
  { key: 'points', abbr: 'PTS', emphasis: true },
  { key: 'penaltyMinutes', abbr: 'PIM', emphasis: false },
]

/** The season stat line, on the jumbotron. */
export function StatsCard({
  question,
  revealedColumns,
  size = 'tv',
  caption,
  className = '',
}: StatsCardProps) {
  const cells: JumboCell[] = COLUMNS.map((col) => ({
    abbr: col.abbr,
    value: String(question[col.key]),
    emphasis: col.emphasis,
  }))

  return (
    <Jumbotron
      cells={cells}
      size={size}
      revealedCount={revealedColumns}
      caption={caption}
      className={className}
    />
  )
}
