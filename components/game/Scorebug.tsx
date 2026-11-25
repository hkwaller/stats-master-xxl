'use client'

import type { Jersey as JerseyData } from '@/types/game'
import { Jersey } from '@/components/game/Jersey'

/**
 * The phone header: your jersey, name, rank and score, and where the game is.
 */
export function PlayerScorebug({
  questionLabel,
  name,
  score,
  rank,
  jersey,
}: {
  questionLabel: string
  name: string
  score: number
  rank: number
  jersey?: JerseyData
}) {
  return (
    <header className="relative z-20">
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        {jersey && (
          <div style={{ transform: 'rotate(-4deg)' }}>
            <Jersey jersey={jersey} size={46} decorative />
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="font-display truncate" style={{ fontSize: 26, lineHeight: 1, textTransform: 'uppercase' }}>
            {name}
          </span>
          <span className="font-mono tabular-nums" style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink-2)' }}>
            #{rank} · {score.toLocaleString('en-US')} PTS
          </span>
        </div>
        <span
          className="font-mono shrink-0"
          style={{
            background: rank === 1 && score > 0 ? 'var(--color-cobalt)' : '#ffffff',
            color: rank === 1 && score > 0 ? '#ffffff' : 'var(--color-ink)',
            border: '2px solid var(--color-ink)',
            borderRadius: 999,
            padding: '5px 11px',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {questionLabel}
        </span>
      </div>
    </header>
  )
}
