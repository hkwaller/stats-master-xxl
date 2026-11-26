'use client'

import { Flame } from 'lucide-react'
import type { Player, Question, HintType } from '@/types/game'
import { MonoLabel } from '@/components/design-system'
import { Jersey } from '@/components/game/Jersey'
import { jerseyFor } from '@/lib/jersey'

const INK = '#14213d'

interface SideRailProps {
  answeredCount: number
  totalPlayers: number
  question: Question | null
  usedHints: HintType[]
  hintsEnabled: boolean
  showEraHint?: boolean
  streak: { player: Player; streak: number } | null
}

const HINT_ROWS: { type: HintType; key: string; value: (q: Question) => string }[] = [
  { type: 'era', key: 'Era', value: (q) => q.era },
  { type: 'team', key: 'Team', value: (q) => q.teamNames },
  { type: 'position', key: 'Position', value: (q) => positionLabel(q.positionCode) },
]

function positionLabel(code: string): string {
  const map: Record<string, string> = {
    C: 'Center',
    LW: 'Left Wing',
    RW: 'Right Wing',
    D: 'Defenseman',
    G: 'Goalie',
  }
  return map[code] ?? code
}

/**
 * The 300px rail beside the career, head-to-head and higher/lower boards on the
 * TV: answers in, hints flipped, streak leader - each a card on the pond.
 */
export function SideRail({
  answeredCount,
  totalPlayers,
  question,
  usedHints,
  hintsEnabled,
  showEraHint = true,
  streak,
}: SideRailProps) {
  const segments = Math.max(1, totalPlayers)

  return (
    <aside className="flex flex-col gap-3.5 py-4 pr-10">
      {/* Answers in */}
      <div
        className="on-ice flex flex-col gap-[11px] px-5 py-4"
      >
        <MonoLabel>Answers in</MonoLabel>
        <div className="flex items-baseline gap-2">
          <span
            className="font-display tabular-nums"
            style={{ fontSize: 52, lineHeight: 0.9, color: INK }}
          >
            {answeredCount}
          </span>
          <span
            className="font-display"
            style={{ fontSize: 24, color: '#4a5a78' }}
          >
            / {totalPlayers}
          </span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: segments }).map((_, i) => (
            <span
              key={i}
              className="flex-1"
              style={{
                height: 10,
                borderRadius: 999,
                background: i < answeredCount ? 'var(--color-cobalt)' : 'var(--color-ice-2)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Hints revealed */}
      {hintsEnabled && question && (
        <div
          className="on-ice flex flex-col gap-3 px-5 py-4"
        >
          <MonoLabel>Hints flipped</MonoLabel>
          {HINT_ROWS.filter((row) => row.type !== 'era' || showEraHint).map((row) => {
            const revealed = usedHints.includes(row.type)
            return (
              <div
                key={row.type}
                className="flex items-baseline justify-between gap-2.5 pb-2.5"
                style={{ borderBottom: '2px solid var(--color-ice-2)' }}
              >
                <MonoLabel>{row.key}</MonoLabel>
                <span
                  className="font-display truncate"
                  style={{ fontSize: 22, color: revealed ? INK : '#5e6d88', textTransform: 'uppercase' }}
                >
                  {revealed ? row.value(question) : 'Face down'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Streak leader */}
      {streak && (
        <div className="on-ice flex flex-col gap-3 px-5 py-4">
          <MonoLabel>Streak leader</MonoLabel>
          <div className="flex items-center gap-[11px]">
            <Jersey jersey={jerseyFor(streak.player)} size={44} decorative />
            <div className="flex flex-col gap-1">
              <span
                className="font-display"
                style={{ fontSize: 22, textTransform: 'uppercase', color: INK }}
              >
                {streak.player.name}
              </span>
              <span
                className="font-mono flex items-center gap-[5px]"
                style={{ fontSize: 12, fontWeight: 700, color: INK }}
              >
                <Flame size={10} strokeWidth={2.4} />
                {streak.streak} IN A ROW
              </span>
            </div>
          </div>
        </div>
      )}

    </aside>
  )
}
