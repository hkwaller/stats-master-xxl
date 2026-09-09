'use client'

import { Zap } from 'lucide-react'
import type { Player } from '@/types/game'
import { Avatar, Kickplate, MonoLabel } from '@/components/design-system'
import { PuckMark } from '@/components/arcade'

const INK = '#0d1b2a'
const RED = '#cf0a2c'

interface ScorebugProps {
  players: Player[]
  /** Player ids that have already answered this round. */
  answeredIds?: string[]
  roomId?: string
  /** e.g. "CLASSIC · EASY" */
  meta?: string
  /** Active powerup, shown as a red chip on the right. */
  powerup?: { label: string; countdown?: string } | null
  /** 52px + 4px kickplate on the phone; 60px + 5px on the TV. */
  compact?: boolean
  className?: string
}

/**
 * A single continuous white strip — not floating pills.
 * Left: puck mark, wordmark, room code. Centre: one hairline-divided cell per
 * player. Right: mode/difficulty and the active powerup. Amber kickplate under.
 */
export function Scorebug({
  players,
  answeredIds = [],
  roomId,
  meta,
  powerup,
  compact = false,
  className = '',
}: ScorebugProps) {
  const sorted = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  const leaderId = sorted.length && (sorted[0].score ?? 0) > 0 ? sorted[0].id : ''

  return (
    <header className={`on-ice-header relative z-20 ${className}`}>
      <div
        className="grid items-stretch"
        style={{ gridTemplateColumns: 'auto 1fr auto', height: compact ? 52 : 60 }}
      >
        {/* Left — identity */}
        <div
          className="flex items-center gap-3 px-5"
          style={{ borderRight: '1px solid rgba(13,27,42,0.10)' }}
        >
          <PuckMark size={compact ? 24 : 28} />
          <div className="flex flex-col gap-[3px]">
            <span
              className="font-display"
              style={{
                fontWeight: 800,
                fontSize: compact ? 16 : 18,
                lineHeight: 1,
                letterSpacing: '0.02em',
              }}
            >
              STATS MASTER
            </span>
            {roomId && <MonoLabel size={9} tracking="0.22em">Room {roomId}</MonoLabel>}
          </div>
        </div>

        {/* Centre — one cell per player */}
        <div className="flex items-stretch overflow-hidden">
          {sorted.map((p, i) => {
            const isLeader = p.id === leaderId
            const answered = answeredIds.includes(p.id)

            return (
              <div
                key={p.id}
                className="relative flex items-center gap-2.5 px-4"
                style={{
                  borderRight: '1px solid rgba(13,27,42,0.08)',
                  background: isLeader ? 'rgba(207,10,44,0.08)' : 'transparent',
                }}
              >
                <span
                  className="font-mono"
                  style={{ fontSize: 9, width: 12, color: isLeader ? RED : '#55677d' }}
                >
                  {i + 1}
                </span>
                <Avatar url={p.avatarUrl} name={p.name} size={24} />
                <span
                  className="font-display whitespace-nowrap"
                  style={{
                    fontWeight: 700,
                    fontSize: 17,
                    letterSpacing: '0.02em',
                    textTransform: 'uppercase',
                    color: INK,
                  }}
                >
                  {p.name}
                </span>
                <span
                  className="font-display tabular-nums"
                  style={{
                    fontWeight: 800,
                    fontSize: 22,
                    lineHeight: 1,
                    color: isLeader ? RED : INK,
                  }}
                >
                  {p.score ?? 0}
                </span>

                {/* "Answered" is a bar pinned to the bottom edge — never a checkmark. */}
                {answered && (
                  <span
                    aria-label={`${p.name} answered`}
                    className="absolute bottom-[7px] left-1/2 -translate-x-1/2"
                    style={{ width: 16, height: 5, borderRadius: 3, background: INK }}
                  />
                )}
              </div>
            )
          })}
          <div className="flex-1" />
        </div>

        {/* Right — mode and active powerup */}
        <div
          className="flex items-center gap-4 px-5"
          style={{ borderLeft: '1px solid rgba(13,27,42,0.10)' }}
        >
          {meta && <MonoLabel size={9} tracking="0.18em">{meta}</MonoLabel>}
          {powerup && (
            <span
              className="font-display flex items-center gap-[7px]"
              style={{
                background: RED,
                color: '#fff',
                padding: '7px 11px',
                fontWeight: 700,
                fontSize: 15,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}
            >
              <Zap size={13} strokeWidth={2.4} />
              {powerup.label}
              {powerup.countdown && ` ${powerup.countdown}`}
            </span>
          )}
        </div>
      </div>

      <Kickplate height={compact ? 4 : 5} />
    </header>
  )
}

/**
 * The phone header: room-relative rank and score for one player only.
 */
export function PlayerScorebug({
  questionLabel,
  name,
  score,
  rank,
}: {
  questionLabel: string
  name: string
  score: number
  rank: number
}) {
  return (
    <header className="on-ice-header relative z-20">
      <div className="flex h-[52px] items-center justify-between px-[18px]">
        <MonoLabel size={9} tracking="0.2em">{questionLabel}</MonoLabel>
        <div className="flex items-center gap-[9px]">
          <span
            className="font-display max-w-[120px] truncate"
            style={{ fontWeight: 700, fontSize: 17, textTransform: 'uppercase', color: INK }}
          >
            {name}
          </span>
          <span
            className="font-display tabular-nums"
            style={{ fontWeight: 800, fontSize: 21, color: INK }}
          >
            {score}
          </span>
          <span
            className="font-mono"
            style={{
              fontSize: 9,
              letterSpacing: '0.14em',
              color: '#fff',
              background: rank === 1 ? RED : INK,
              padding: '3px 6px',
            }}
          >
            #{rank}
          </span>
        </div>
      </div>
      <Kickplate height={4} />
    </header>
  )
}
