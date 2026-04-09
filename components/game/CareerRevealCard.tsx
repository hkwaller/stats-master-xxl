'use client'

import { motion } from 'framer-motion'
import type { DifficultyTier, Question } from '@/types/game'
import { TierBadge } from '@/components/design-system'

interface CareerRevealCardProps {
  seasons: Question[] // all seasons for this player (in reveal order)
  revealedCount: number // how many have been revealed so far
  buzzedInPlayerName?: string
  lockedOutCount?: number
}

const FIELD_LABELS: {
  key: keyof Question
  abbr: string
  color?: string
  isTier?: boolean
  cellClass?: string
}[] = [
  { key: 'season', abbr: 'Season', cellClass: 'whitespace-nowrap min-w-[5.5rem]' },
  { key: 'gamesPlayed', abbr: 'GP' },
  { key: 'goals', abbr: 'G' },
  { key: 'assists', abbr: 'A' },
  { key: 'points', abbr: 'PTS', color: 'text-[#c8102e] font-extrabold' },
  { key: 'penaltyMinutes', abbr: 'PIM' },
  { key: 'difficulty', abbr: 'Tier', isTier: true },
]

function SeasonTable({ rows, revealedIds }: { rows: Question[]; revealedIds: Set<string> }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-black text-white">
          {FIELD_LABELS.map((f) => (
            <th
              key={f.abbr}
              className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-center border border-black/20"
            >
              {f.abbr}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((season, i) => {
          const isRevealed = revealedIds.has(season.id)
          return (
            <motion.tr
              key={season.id}
              className={`border-b border-black/10 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
              animate={isRevealed ? { backgroundColor: i % 2 === 0 ? '#ffffff' : '#f9fafb' } : {}}
              initial={false}
            >
              {FIELD_LABELS.map((f) => (
                <td
                  key={f.abbr}
                  className={`
                    px-3 py-2.5 text-center text-sm tabular-nums border border-black/10
                    ${f.cellClass ?? ''}
                    ${
                      isRevealed
                        ? f.isTier
                          ? ''
                          : (f.color ?? 'text-black font-semibold')
                        : 'text-black/25 select-none'
                    }
                    transition-all duration-300
                  `}
                  style={isRevealed ? undefined : { filter: 'blur(3px)' }}
                >
                  {f.isTier ? (
                    season[f.key] ? (
                      <TierBadge
                        tier={season[f.key] as DifficultyTier}
                        className={isRevealed ? '' : 'opacity-30'}
                      />
                    ) : (
                      <span className="text-black/30">—</span>
                    )
                  ) : (
                    String(season[f.key] ?? '—')
                  )}
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
  // Which season IDs have been revealed (first N in reveal order)
  const revealedIds = new Set(seasons.slice(0, revealedCount).map((s) => s.id))

  // Always display in chronological order
  const chronological = [...seasons].sort((a, b) => a.seasonId - b.seasonId)

  // Split into two columns when there are many seasons
  const useGrid = chronological.length > 10
  const mid = useGrid ? Math.ceil(chronological.length / 2) : chronological.length
  const leftCol = chronological.slice(0, mid)
  const rightCol = useGrid ? chronological.slice(mid) : []

  return (
    <div className="w-full space-y-3">
      {buzzedInPlayerName && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-yellow border-4 border-black shadow-[4px_4px_0_#000] px-4 py-2 text-center"
        >
          <span className="font-bold text-black uppercase tracking-widest text-sm">
            🚨 {buzzedInPlayerName} is answering…
          </span>
        </motion.div>
      )}

      {useGrid ? (
        <div className="grid grid-cols-2 gap-3">
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

      <div className="flex items-center justify-between text-xs text-game-text-muted px-1">
        <span>
          {revealedCount} / {seasons.length} seasons revealed
        </span>
        {lockedOutCount > 0 && (
          <span className="text-game-red font-bold">
            {lockedOutCount} player{lockedOutCount !== 1 ? 's' : ''} locked out
          </span>
        )}
      </div>
    </div>
  )
}
