'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { RotateCcw, Settings } from 'lucide-react'
import type { DifficultyTier, Player, QuestionResult } from '@/types/game'
import { GameHeading, MonoLabel, TierBadge } from '@/components/design-system'
import { Jersey } from '@/components/game/Jersey'
import { jerseyFor } from '@/lib/jersey'
import { gameAwards, playerSummary } from '@/lib/streaks'

const INK = 'var(--color-ink)'

interface ScoreboardProps {
  players: Player[]
  variant?: 'live' | 'final'
  myId?: string
  history?: QuestionResult[]
}

export function Scoreboard({ players, variant = 'live', myId, history = [] }: ScoreboardProps) {
  const sorted = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  if (variant === 'final') return <RestOfBinder players={sorted} myId={myId} history={history} start={0} />
  return <LiveScoreboard players={sorted} myId={myId} />
}

// ─── Live standings (phone) ───────────────────────────────────────────────────
// Jersey, name, score. The leader's score sits on cobalt and keeps rank 1; you
// are the card with the offset.

function LiveScoreboard({ players, myId }: { players: Player[]; myId?: string }) {
  const leaderId = players.length && (players[0].score ?? 0) > 0 ? players[0].id : ''

  return (
    <ol className="m-0 flex list-none flex-col gap-2 p-0">
      <AnimatePresence initial={false}>
        {players.map((player, i) => {
          const isLeader = player.id === leaderId
          const isMe = player.id === myId
          return (
            <motion.li
              key={player.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="flex items-center gap-3 px-3 py-2"
              style={{
                background: '#ffffff',
                border: `2.5px solid ${INK}`,
                borderRadius: 14,
                boxShadow: isMe ? `4px 4px 0 ${INK}` : 'none',
              }}
            >
              <span className="font-mono" style={{ width: 22, fontSize: 13, fontWeight: 700 }}>
                #{i + 1}
              </span>
              <Jersey jersey={jerseyFor(player)} size={40} decorative />
              <span className="font-display min-w-0 flex-1 truncate" style={{ fontSize: 22, textTransform: 'uppercase' }}>
                {player.name}
                {isMe && <span className="font-mono ml-2" style={{ fontSize: 11, color: 'var(--color-ink-2)' }}>YOU</span>}
              </span>
              <span
                key={player.score ?? 0}
                className="font-mono score-change tabular-nums"
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  background: isLeader ? 'var(--color-cobalt)' : 'var(--color-ice-1)',
                  color: isLeader ? '#ffffff' : INK,
                  borderRadius: 999,
                  padding: '4px 12px',
                }}
              >
                {(player.score ?? 0).toLocaleString('en-US')}
              </span>
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ol>
  )
}

// ─── The rest of the binder (4th place down) ─────────────────────────────────

function RestOfBinder({
  players,
  myId,
  history,
  start,
}: {
  players: Player[]
  myId?: string
  history: QuestionResult[]
  start: number
}) {
  if (players.length === 0) return null
  return (
    <div
      className="overflow-hidden"
      style={{ background: '#ffffff', border: `3px solid ${INK}`, borderRadius: 16, boxShadow: `5px 5px 0 ${INK}` }}
    >
      <div
        className="font-mono"
        style={{ background: INK, color: '#fff', padding: '6px 14px', fontSize: 13, fontWeight: 700, letterSpacing: '0.06em' }}
      >
        THE REST OF THE BINDER
      </div>
      <ol className="m-0 list-none p-0">
        {players.map((p, i) => {
          const { correct } = playerSummary(history, p.id)
          return (
            <li
              key={p.id}
              className="flex items-center gap-3 px-3.5 py-2.5"
              style={{
                borderTop: i === 0 ? undefined : '2px solid var(--color-ice-2)',
                background: p.id === myId ? 'var(--color-ice-1)' : undefined,
              }}
            >
              <span className="font-display" style={{ width: 22, fontSize: 26 }}>
                {start + i + 1}
              </span>
              <Jersey jersey={jerseyFor(p)} size={44} decorative />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-display truncate" style={{ fontSize: 23, lineHeight: 1.05, textTransform: 'uppercase' }}>
                  {p.name}
                </span>
                <span className="font-mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-ink-2)' }}>
                  {correct} OF {history.length} NAMED
                </span>
              </div>
              <span className="font-mono tabular-nums" style={{ fontSize: 18, fontWeight: 700 }}>
                {(p.score ?? 0).toLocaleString('en-US')}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

// ─── Final board ──────────────────────────────────────────────────────────────
// FINAL WHISTLE: the top three stand on a podium in their jerseys, the rest of
// the binder and the game awards sit beside it.

interface FinalBoardProps {
  players: Player[]
  history?: QuestionResult[]
  myId?: string
  /** e.g. "Classic · 10 cards" */
  eyebrow?: string
  tier?: DifficultyTier
  /** Phone layout: smaller podium, everything stacked. */
  compact?: boolean
  onRematch?: () => void
  onSettings?: () => void
  children?: React.ReactNode
}

const PODIUM = [
  { place: 2, block: 110, tv: 150, phone: 84, fill: '#ffffff', fg: INK },
  { place: 1, block: 150, tv: 190, phone: 104, fill: 'var(--color-cobalt)', fg: '#ffffff' },
  { place: 3, block: 80, tv: 130, phone: 74, fill: '#ffffff', fg: INK },
]

export function FinalBoard({
  players,
  history = [],
  myId,
  eyebrow,
  tier,
  compact = false,
  onRematch,
  onSettings,
  children,
}: FinalBoardProps) {
  const sorted = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  const awards = gameAwards(history, sorted)
  const scale = compact ? 0.6 : 1

  return (
    <div className={`flex min-h-0 flex-1 flex-col gap-6 ${compact ? 'px-4 pt-6 pb-6' : 'px-10 pt-8 pb-8'}`}>
      <div className="flex flex-wrap items-center gap-3">
        <GameHeading size={compact ? 52 : 76} className="mr-auto">
          Final whistle
        </GameHeading>
        {eyebrow && <MonoLabel size={13}>{eyebrow}</MonoLabel>}
        {tier && <TierBadge tier={tier} />}
      </div>

      <div className={`flex flex-1 gap-10 ${compact ? 'flex-col' : 'items-end'}`}>
        {/* Podium */}
        <ol className="m-0 flex flex-1 list-none items-end justify-center gap-4 p-0" aria-label="Podium">
          {PODIUM.map(({ place, block, tv, phone, fill, fg }) => {
            const p = sorted[place - 1]
            if (!p) return null
            return (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (3 - place) * 0.12, duration: 0.25, ease: 'easeOut' }}
                className="relative flex flex-1 flex-col items-center gap-2"
                style={{ maxWidth: compact ? 120 : 240 }}
              >
                {place === 1 && (p.score ?? 0) > 0 && (
                  <span
                    className="font-display absolute z-[1]"
                    style={{
                      top: -8,
                      right: 4,
                      background: 'var(--color-lemon)',
                      border: `3px solid ${INK}`,
                      borderRadius: 10,
                      padding: '4px 12px',
                      fontSize: compact ? 20 : 30,
                      lineHeight: 1,
                      transform: 'rotate(10deg)',
                      boxShadow: `3px 3px 0 ${INK}`,
                    }}
                  >
                    MVP
                  </span>
                )}
                <Jersey jersey={jerseyFor(p)} name={p.name} size={compact ? phone : tv} />
                <div className="flex flex-col items-center">
                  <span className="font-display" style={{ fontSize: compact ? 20 : place === 1 ? 36 : 30, lineHeight: 1, textTransform: 'uppercase' }}>
                    {p.name}
                    {p.id === myId && <span className="sr-only"> (you)</span>}
                  </span>
                  <span className="font-mono tabular-nums" style={{ fontSize: compact ? 15 : 20, fontWeight: 700 }}>
                    {(p.score ?? 0).toLocaleString('en-US')}
                  </span>
                </div>
                <div
                  className="font-display flex w-full justify-center"
                  style={{
                    height: block * scale,
                    background: fill,
                    color: fg,
                    border: `3px solid ${INK}`,
                    borderRadius: '14px 14px 0 0',
                    paddingTop: 6,
                    fontSize: (place === 1 ? 80 : 60) * scale,
                    lineHeight: 1,
                  }}
                >
                  {place}
                </div>
              </motion.li>
            )
          })}
        </ol>

        {/* The rest, awards and what next */}
        <aside className={`flex flex-col gap-3.5 ${compact ? '' : 'w-[360px] shrink-0'}`}>
          <RestOfBinder players={sorted.slice(3)} myId={myId} history={history} start={3} />

          {awards.length > 0 && (
            <div className="grid grid-cols-2 gap-2.5">
              {awards.map((a, i) => (
                <div
                  key={a.title}
                  className="flex flex-col gap-0.5 px-3 py-2.5"
                  style={{
                    background: '#ffffff',
                    border: `2.5px solid ${INK}`,
                    borderRadius: 14,
                    transform: `rotate(${i % 2 ? 1.5 : -1.5}deg)`,
                  }}
                >
                  <MonoLabel>{a.title}</MonoLabel>
                  <span className="font-display" style={{ fontSize: 22, lineHeight: 1.05, textTransform: 'uppercase' }}>
                    {a.player.name}
                  </span>
                  <span style={{ fontSize: 13 }}>{a.detail}</span>
                </div>
              ))}
            </div>
          )}

          {children}

          {(onRematch || onSettings) && (
            <div className="mt-2 flex flex-col gap-2.5">
              {onRematch && (
                <button
                  type="button"
                  onClick={onRematch}
                  className="btn-ice font-display flex min-h-[58px] items-center justify-center gap-2.5"
                  style={{
                    background: 'var(--color-cobalt)',
                    color: '#fff',
                    border: `3px solid ${INK}`,
                    boxShadow: `4px 4px 0 ${INK}`,
                    fontSize: 24,
                    letterSpacing: '0.03em',
                    cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={18} strokeWidth={2.4} aria-hidden />
                  REMATCH · SAME JERSEYS
                </button>
              )}
              {onSettings && (
                <button
                  type="button"
                  onClick={onSettings}
                  className="btn-ice font-display flex min-h-[52px] items-center justify-center gap-2.5"
                  style={{
                    background: '#fff',
                    color: INK,
                    border: `2.5px solid ${INK}`,
                    fontSize: 20,
                    letterSpacing: '0.03em',
                    cursor: 'pointer',
                  }}
                >
                  <Settings size={17} strokeWidth={2.4} aria-hidden />
                  CHANGE SETTINGS
                </button>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
