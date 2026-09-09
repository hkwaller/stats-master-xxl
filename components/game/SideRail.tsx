'use client'

import { Flame } from 'lucide-react'
import type { Player, Question, HintType } from '@/types/game'
import { Avatar, MonoLabel } from '@/components/design-system'

const INK = '#0d1b2a'
const RED = '#cf0a2c'

interface SideRailProps {
  answeredCount: number
  totalPlayers: number
  question: Question | null
  usedHints: HintType[]
  hintsEnabled: boolean
  streak: { player: Player; streak: number } | null
  /** Host controls pin to the bottom, filling the width with no gap between them. */
  controls?: RailControl[]
}

export interface RailControl {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  tone: 'red' | 'navy'
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
 * The 300px rail on the game TV. Its left border is a blue line standing in for
 * a rink line, and the ice reads through the translucent white behind it.
 */
export function SideRail({
  answeredCount,
  totalPlayers,
  question,
  usedHints,
  hintsEnabled,
  streak,
  controls,
}: SideRailProps) {
  const segments = Math.max(1, totalPlayers)

  return (
    <aside
      className="flex flex-col"
      style={{
        borderLeft: '7px solid rgba(11,83,201,0.55)',
        background: 'rgba(255,255,255,0.72)',
      }}
    >
      {/* Answers in */}
      <div
        className="flex flex-col gap-[11px] px-5 py-[18px]"
        style={{ borderBottom: '1px solid rgba(13,27,42,0.10)' }}
      >
        <MonoLabel size={9}>Answers in</MonoLabel>
        <div className="flex items-baseline gap-2">
          <span
            className="font-display tabular-nums"
            style={{ fontWeight: 800, fontSize: 48, lineHeight: 0.8, color: INK }}
          >
            {answeredCount}
          </span>
          <span
            className="font-display"
            style={{ fontWeight: 700, fontSize: 22, color: '#55677d' }}
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
                height: 5,
                background: i < answeredCount ? INK : 'rgba(13,27,42,0.14)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Hints revealed */}
      {hintsEnabled && question && (
        <div
          className="flex flex-col gap-[13px] px-5 py-[18px]"
          style={{ borderBottom: '1px solid rgba(13,27,42,0.10)' }}
        >
          <MonoLabel size={9}>Hints revealed</MonoLabel>
          {HINT_ROWS.map((row) => {
            const revealed = usedHints.includes(row.type)
            return (
              <div
                key={row.type}
                className="flex items-baseline justify-between gap-2.5 pb-2.5"
                style={{ borderBottom: '1px solid rgba(13,27,42,0.07)' }}
              >
                <MonoLabel size={9} tracking="0.2em">{row.key}</MonoLabel>
                <span
                  className="font-display truncate"
                  style={{
                    fontWeight: 700,
                    fontSize: 21,
                    color: revealed ? INK : '#6b7a8c',
                  }}
                >
                  {revealed ? row.value(question) : 'LOCKED'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Streak leader */}
      {streak && (
        <div className="flex flex-col gap-3 px-5 py-[18px]">
          <MonoLabel size={9}>Streak leader</MonoLabel>
          <div className="flex items-center gap-[11px]">
            <Avatar url={streak.player.avatarUrl} name={streak.player.name} size={36} />
            <div className="flex flex-col gap-1">
              <span
                className="font-display"
                style={{ fontWeight: 700, fontSize: 19, textTransform: 'uppercase', color: INK }}
              >
                {streak.player.name}
              </span>
              <span
                className="font-mono flex items-center gap-[5px]"
                style={{ fontSize: 9, letterSpacing: '0.14em', color: RED }}
              >
                <Flame size={10} strokeWidth={2.4} />
                {streak.streak} IN A ROW
              </span>
            </div>
          </div>
        </div>
      )}

      {controls && controls.length > 0 && (
        <div
          className="mt-auto grid"
          style={{ gridTemplateColumns: `repeat(${controls.length}, 1fr)` }}
        >
          {controls.map((c) => (
            <button
              key={c.label}
              onClick={c.onClick}
              className="btn-ice font-display flex items-center justify-center gap-2"
              style={{
                padding: '18px 0',
                background: c.tone === 'red' ? RED : INK,
                border: 'none',
                color: c.tone === 'red' ? '#fff' : '#eef3f9',
                fontWeight: 700,
                fontSize: 16,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              {c.icon}
              {c.label}
            </button>
          ))}
        </div>
      )}
    </aside>
  )
}
