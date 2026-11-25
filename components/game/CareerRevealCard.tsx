'use client'

import { useLayoutEffect, useRef } from 'react'
import { Pause } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Question } from '@/types/game'
import { MonoLabel } from '@/components/design-system'

const INK = 'var(--color-ink)'
const COBALT = 'var(--color-cobalt)'

interface CareerRevealCardProps {
  size?: 'compact' | 'tv'
  seasons: Question[] // full career, earliest season first
  revealedCount: number // how many have been revealed so far
  showYears?: boolean
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
 * A career as a stat sheet, with each revealed season appended in order.
 */
function SeasonTable({ rows, showYears }: { rows: Question[]; showYears: boolean }) {
  return (
    <table className="w-full table-fixed border-collapse" style={{ minWidth: 320 }}>
      <colgroup>
        <col style={{ width: '28%' }} />
        {COLUMNS.slice(1).map((c) => <col key={c.key} style={{ width: '14.4%' }} />)}
      </colgroup>
      <thead>
        <tr>
          {COLUMNS.map((c) => (
            <th
              key={c.abbr}
              className="font-mono sticky top-0 z-10 pb-2"
              style={{
                textAlign: c.align,
                fontSize: 'var(--career-label-size, 11px)',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: c.emphasis ? INK : 'var(--color-ink-2)',
                background: c.emphasis ? 'var(--color-lemon)' : 'var(--color-ice-0)',
                borderBottom: `2px solid ${INK}`,
                padding: 'var(--career-header-padding, 0 8px 8px)',
                whiteSpace: 'nowrap',
              }}
            >
              {c.abbr}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((season, index) => (
          <tr key={`${season.playerId}:${season.seasonId}`} className={`career-season-row ${season === rows[rows.length - 1] ? 'career-season-latest' : ''}`}>
            {COLUMNS.map((c) => (
              <td
                key={c.abbr}
                className="tabular-nums"
                style={{
                  textAlign: c.align,
                  padding: 'var(--career-row-padding, 9px 8px)',
                  borderBottom: '2px solid var(--color-ice-2)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  background: c.emphasis ? 'var(--color-lemon)' : undefined,
                  fontSize: c.key === 'season'
                    ? 'var(--career-season-size, 18px)'
                    : 'var(--career-stat-size, 20px)',
                  lineHeight: 1,
                  color: INK,
                  whiteSpace: 'nowrap',
                }}
              >
                {c.key === 'season' && !showYears ? `Season ${index + 1}` : String(season[c.key] ?? '-')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function CareerRevealCard({
  size = 'compact',
  seasons,
  revealedCount,
  showYears = true,
  buzzedInPlayerName,
  lockedOutCount = 0,
}: CareerRevealCardProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const visibleSeasons = seasons.slice(0, revealedCount)
  const firstSeasonId = seasons[0]?.id

  useLayoutEffect(() => {
    const container = scrollRef.current
    if (!container) return
    // Scroll only the stat sheet, leaving the timer and buzz controls in place.
    container.scrollTo({
      top: revealedCount <= 1 ? 0 : container.scrollHeight,
      behavior: revealedCount <= 1 || window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant' : 'smooth',
    })
  }, [revealedCount, firstSeasonId])

  return (
    <div className={`flex w-full flex-col gap-4 ${size === 'tv' ? 'career-reveal-tv' : ''}`}>
      {buzzedInPlayerName && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.16 }}
          className="career-possession flex flex-wrap items-center justify-between gap-2 px-4 py-3"
          style={{ background: COBALT, color: '#fff', border: `3px solid ${INK}`, borderRadius: 14 }}
        >
          <span
            className="font-display"
            style={{
              fontSize: size === 'tv' ? 30 : 22,
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
            }}
          >
            {buzzedInPlayerName} is answering
          </span>
          <span className="flex items-center gap-2 text-sm">
            <Pause size={14} strokeWidth={2.4} aria-hidden="true" />
            Seasons paused
          </span>
        </motion.div>
      )}

      <div
        ref={scrollRef}
        role="region"
        aria-label="Revealed career seasons"
        tabIndex={0}
        className="career-season-scroll overflow-auto overscroll-contain"
        style={{ height: 'var(--career-sheet-height, min(40vh, 360px))' }}
      >
        <SeasonTable rows={visibleSeasons} showYears={showYears} />
      </div>

      <div
        className="flex items-baseline justify-between gap-3 pt-1"
        style={{ borderTop: '2px solid var(--color-ice-2)', paddingTop: 12 }}
      >
        <MonoLabel size={size === 'tv' ? 13 : 11}>
          {visibleSeasons.length} {visibleSeasons.length === 1 ? 'season' : 'seasons'} revealed
        </MonoLabel>
        {lockedOutCount > 0 && (
          <MonoLabel size={size === 'tv' ? 13 : 11} color={INK}>
            {lockedOutCount} in the penalty box
          </MonoLabel>
        )}
      </div>
    </div>
  )
}
