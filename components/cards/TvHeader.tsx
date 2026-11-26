import { Zap } from 'lucide-react'
import type { DifficultyTier } from '@/types/game'
import { TierBadge } from '@/components/design-system'
import { PuckMark } from '@/components/arcade'

const INK = 'var(--color-ink)'

export interface HeaderControl {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  primary?: boolean
}

/**
 * The TV's top strip: wordmark, where we are in the game, the tier, the room
 * code, any live power play, and - for the host or boss - the game controls.
 */
export function TvHeader({
  roomId,
  progress,
  modeLabel,
  tier,
  powerup,
  controls = [],
}: {
  roomId: string
  progress: string
  modeLabel: string
  tier?: DifficultyTier
  powerup?: string | null
  controls?: HeaderControl[]
}) {
  return (
    <header className="relative z-20 flex flex-wrap items-center gap-2.5 px-10 pt-6 pb-2">
      <div className="mr-auto flex items-center gap-2.5">
        <PuckMark size={32} />
        <span className="font-display" style={{ fontSize: 30, lineHeight: 1, letterSpacing: '0.02em' }}>
          STATS MASTER
        </span>
      </div>
      {powerup && (
        <Pill bg="var(--color-lemon)">
          <Zap size={14} strokeWidth={2.4} aria-hidden />
          {powerup}
        </Pill>
      )}
      <Pill bg={INK} fg="#ffffff" border={false}>
        {progress}
      </Pill>
      <Pill bg="#ffffff">{modeLabel}</Pill>
      {tier && <TierBadge tier={tier} />}
      <Pill bg="#ffffff">ROOM {roomId}</Pill>
      {controls.length > 0 && (
        <div className="ml-2 flex items-center gap-2" role="group" aria-label="Host controls">
          {controls.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={c.onClick}
              className="btn-ice font-display flex min-h-[44px] items-center gap-2"
              style={{
                background: c.primary ? 'var(--color-cobalt)' : '#ffffff',
                color: c.primary ? '#ffffff' : INK,
                border: `3px solid ${INK}`,
                boxShadow: c.primary ? `3px 3px 0 ${INK}` : 'none',
                padding: '0 16px',
                fontSize: 17,
                letterSpacing: '0.03em',
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
    </header>
  )
}

function Pill({
  children,
  bg,
  fg = INK,
  border = true,
}: {
  children: React.ReactNode
  bg: string
  fg?: string
  border?: boolean
}) {
  return (
    <span
      className="font-mono inline-flex items-center gap-1.5"
      style={{
        background: bg,
        color: fg,
        border: border ? `2px solid ${INK}` : '2px solid transparent',
        borderRadius: 999,
        padding: '6px 14px',
        fontSize: 14,
        fontWeight: 700,
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}
