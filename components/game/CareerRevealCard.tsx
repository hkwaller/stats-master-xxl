'use client'

import { motion } from 'framer-motion'
import type { Question } from '@/types/game'
import { MonoLabel } from '@/components/design-system'

const INK = '#0d1b2a'
const RED = '#cf0a2c'

interface CareerRevealCardProps {
  seasons: Question[] // all seasons for this player (in reveal order)
  revealedCount: number // how many have been revealed so far
  buzzedInPlayerName?: string
  lockedOutCount?: number
}

const COLUMNS: {
  key: keyof Question
  abbr: string
  align: 'left' | 'right'
  emphasis?: boolean
}[] = [
  { key: 'season', abbr: 'Season', align: 'left' },
  { key: 'gamesPlayed', abbr: 'GP', align: 'right' },
  { key: 'goals', abbr: 'G', align: 'right' },
  { key: 'assists', abbr: 'A', align: 'right' },
  { key: 'points', abbr: 'PTS', align: 'right', emphasis: true },
  { key: 'penaltyMinutes', abbr: 'PIM', align: 'right' },
]

/**
 * A career as a stat sheet: hairline-ruled rows on white, revealed rows in navy
 * ink and unrevealed ones blurred out. No table chrome, no zebra striping.
 */
function SeasonTable({ rows, revealedIds }: { rows: Question[]; revealedIds: Set<string> }) {
  return (
    <table className="w-full border-collapse" style={{ minWidth: 320 }}>
      <thead>
        <tr>
          {COLUMNS.map((c) => (
            <th
              key={c.abbr}
              className="font-mono pb-2"
              style={{
                textAlign: c.align,
                fontSize: 9,
                fontWeight: 400,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: '#55677d',
                borderBottom: `1px solid rgba(13,27,42,0.10)`,
                padding: '0 8px 8px',
                whiteSpace: 'nowrap',
              }}
            >
              {c.abbr}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((season) => {
          const isRevealed = revealedIds.has(season.id)
          return (
            <motion.tr key={season.id} initial={false}>
              {COLUMNS.map((c) => (
                <td
                  key={c.abbr}
                  className="tabular-nums"
                  style={{
                    textAlign: c.align,
                    padding: '9px 8px',
                    borderBottom: '1px solid rgba(13,27,42,0.07)',
                    fontFamily: 'var(--font-display)',
                    fontWeight: c.emphasis ? 800 : 700,
                    fontSize: c.key === 'season' ? 18 : 20,
                    lineHeight: 1,
                    color: !isRevealed ? '#7d8b9c' : c.emphasis ? RED : INK,
                    filter: isRevealed ? undefined : 'blur(4px)',
                    userSelect: isRevealed ? undefined : 'none',
                    whiteSpace: 'nowrap',
                    transition: 'filter 300ms ease-out, color 300ms ease-out',
                  }}
                >
                  {String(season[c.key] ?? '—')}
                </td>
              ))}
            </motion.tr>
          )
        })}
      </tbody>
    </table>
  )
}

export function CareerRevealCard({
  seasons,
  revealedCount,
  buzzedInPlayerName,
  lockedOutCount = 0,
}: CareerRevealCardProps) {
  const revealedIds = new Set(seasons.slice(0, revealedCount).map((s) => s.id))

  // Always display in chronological order, whatever the reveal order was.
  const chronological = [...seasons].sort((a, b) => a.seasonId - b.seasonId)

  const useGrid = chronological.length > 10
  const mid = useGrid ? Math.ceil(chronological.length / 2) : chronological.length
  const leftCol = chronological.slice(0, mid)
  const rightCol = useGrid ? chronological.slice(mid) : []

  return (
    <div className="flex w-full flex-col gap-4">
      {buzzedInPlayerName && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.16 }}
          className="px-4 py-2.5"
          style={{ background: RED, color: '#fff' }}
        >
          <span
            className="font-display"
            style={{
              fontWeight: 700,
              fontSize: 18,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {buzzedInPlayerName} is answering
          </span>
        </motion.div>
      )}

      {useGrid ? (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="overflow-x-auto">
            <SeasonTable rows={leftCol} revealedIds={revealedIds} />
          </div>
          <div className="overflow-x-auto">
            <SeasonTable rows={rightCol} revealedIds={revealedIds} />
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <SeasonTable rows={leftCol} revealedIds={revealedIds} />
        </div>
      )}

      <div
        className="flex items-baseline justify-between gap-3 pt-1"
        style={{ borderTop: '1px solid rgba(13,27,42,0.10)', paddingTop: 12 }}
      >
        <MonoLabel size={9} tracking="0.18em">
          {revealedCount} / {seasons.length} seasons revealed
        </MonoLabel>
        {lockedOutCount > 0 && (
          <MonoLabel size={9} tracking="0.18em" color={RED}>
            {lockedOutCount} in the penalty box
          </MonoLabel>
        )}
      </div>
    </div>
  )
}
