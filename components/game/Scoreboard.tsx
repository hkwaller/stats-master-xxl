'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { RotateCcw, Settings } from 'lucide-react'
import type { Player, QuestionResult } from '@/types/game'
import { Avatar, GameHeading, MonoLabel } from '@/components/design-system'
import { JumbotronPanel } from '@/components/arcade'
import { currentStreak, playerSummary } from '@/lib/streaks'

const INK = '#0d1b2a'
const RED = '#cf0a2c'
const LED = '#ffb01f'

interface ScoreboardProps {
  players: Player[]
  variant?: 'live' | 'final'
  myId?: string
  history?: QuestionResult[]
}

export function Scoreboard({ players, variant = 'live', myId, history = [] }: ScoreboardProps) {
  const sorted = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  if (variant === 'final') return <ResultRows players={sorted} myId={myId} history={history} />
  return <LiveScoreboard players={sorted} myId={myId} />
}

// ─── Live standings ───────────────────────────────────────────────────────────
// Hairline-divided rows on white. The leader is tinted red and carries rank 1,
// so the state never lives in colour alone.

function LiveScoreboard({ players, myId }: { players: Player[]; myId?: string }) {
  const leaderId = players.length && (players[0].score ?? 0) > 0 ? players[0].id : ''

  return (
    <div className="flex flex-col">
      <AnimatePresence initial={false}>
        {players.map((player, i) => {
          const isLeader = player.id === leaderId
          return (
            <motion.div
              key={player.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="grid items-center gap-3 px-3 py-2.5"
              style={{
                gridTemplateColumns: '18px 26px 1fr auto',
                background: isLeader ? 'rgba(207,10,44,0.07)' : 'transparent',
                borderBottom: '1px solid rgba(13,27,42,0.09)',
                borderLeft: `4px solid ${player.id === myId ? INK : 'transparent'}`,
              }}
            >
              <span
                className="font-mono"
                style={{ fontSize: 10, color: isLeader ? RED : '#55677d' }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <Avatar url={player.avatarUrl} name={player.name} size={26} />
              <span
                className="font-display truncate"
                style={{
                  fontWeight: 700,
                  fontSize: 19,
                  textTransform: 'uppercase',
                  color: INK,
                }}
              >
                {player.name}
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
                {player.score ?? 0}
              </span>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

// ─── Result rows ──────────────────────────────────────────────────────────────

function metaLine(history: QuestionResult[], playerId: string): string {
  const { correct, wrong } = playerSummary(history, playerId)
  const streak = currentStreak(history, playerId)
  const parts = [`${correct} CORRECT`]
  if (streak > 1) parts.push(`STREAK ${streak}`)
  if (wrong > 0) parts.push(`${wrong} MISSED`)
  return parts.join(' · ')
}

function ResultRows({
  players,
  myId,
  history,
}: {
  players: Player[]
  myId?: string
  history: QuestionResult[]
}) {
  return (
    <div className="flex flex-col">
      {players.map((p, i) => {
        const isWinner = i === 0
        const { correct } = playerSummary(history, p.id)
        const scoredNothing = correct === 0

        return (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.2, ease: 'easeOut' }}
            className="grid items-center gap-[18px] px-5 py-4"
            style={{
              gridTemplateColumns: '30px 34px 1fr auto 82px',
              background: isWinner ? 'rgba(207,10,44,0.07)' : '#ffffff',
              borderLeft: `5px solid ${isWinner ? RED : scoredNothing ? '#b3c0cf' : INK}`,
              borderBottom: '1px solid rgba(13,27,42,0.09)',
              boxShadow: p.id === myId ? 'inset 0 0 0 1px rgba(13,27,42,0.14)' : undefined,
            }}
          >
            <span
              className="font-mono"
              style={{ fontSize: 11, color: isWinner ? RED : '#55677d' }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <Avatar url={p.avatarUrl} name={p.name} size={34} />
            <span
              className="font-display truncate"
              style={{ fontWeight: 700, fontSize: 27, textTransform: 'uppercase', color: INK }}
            >
              {p.name}
            </span>
            <MonoLabel size={9} tracking="0.14em">{metaLine(history, p.id)}</MonoLabel>
            <span
              className="font-display tabular-nums text-right"
              style={{
                fontWeight: 800,
                fontSize: 34,
                lineHeight: 1,
                color: isWinner ? RED : INK,
              }}
            >
              {p.score ?? 0}
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}

// ─── Final board ──────────────────────────────────────────────────────────────
// The winner is announced on the jumbotron rather than on a podium.

interface FinalBoardProps {
  players: Player[]
  history?: QuestionResult[]
  myId?: string
  /** e.g. "FINAL · 10 QUESTIONS · CLASSIC" */
  eyebrow?: string
  onRematch?: () => void
  onSettings?: () => void
  children?: React.ReactNode
}

export function FinalBoard({
  players,
  history = [],
  myId,
  eyebrow,
  onRematch,
  onSettings,
  children,
}: FinalBoardProps) {
  const sorted = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  const winner = sorted[0]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-2 px-10 pt-11">
        {eyebrow && <MonoLabel size={10} tracking="0.3em">{eyebrow}</MonoLabel>}
        <GameHeading size={84} style={{ lineHeight: 0.88 }}>
          Final board
        </GameHeading>
      </div>

      {winner && (
        <JumbotronPanel className="mx-10 mt-8">
          <div className="flex items-end justify-between gap-5">
            <div className="flex flex-col gap-2.5">
              <span
                className="font-mono"
                style={{ fontSize: 10, letterSpacing: '0.3em', color: 'rgba(255,176,31,0.65)' }}
              >
                WINNER
              </span>
              <span
                className="led-glow"
                style={{
                  fontFamily: 'var(--font-led)',
                  fontWeight: 700,
                  fontSize: 56,
                  lineHeight: 0.9,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: LED,
                }}
              >
                {winner.name}
              </span>
            </div>
            <span
              className="led-glow tabular-nums"
              style={{
                fontFamily: 'var(--font-led)',
                fontWeight: 700,
                fontSize: 96,
                lineHeight: 0.8,
                color: LED,
              }}
            >
              {winner.score ?? 0}
            </span>
          </div>
        </JumbotronPanel>
      )}

      <div className="mx-10 mt-7">
        <ResultRows players={sorted} myId={myId} history={history} />
      </div>

      {children}

      {(onRematch || onSettings) && (
        <div className="mt-auto grid grid-cols-2 pt-8">
          <button
            onClick={onRematch}
            disabled={!onRematch}
            className="btn-ice font-display flex items-center justify-center gap-2.5"
            style={{
              padding: '24px 0',
              background: RED,
              border: 'none',
              color: '#fff',
              fontWeight: 700,
              fontSize: 19,
              letterSpacing: '0.14em',
              opacity: onRematch ? 1 : 0.4,
              cursor: onRematch ? 'pointer' : 'not-allowed',
            }}
          >
            <RotateCcw size={15} strokeWidth={2.2} />
            REMATCH
          </button>
          <button
            onClick={onSettings}
            disabled={!onSettings}
            className="btn-ice font-display flex items-center justify-center gap-2.5"
            style={{
              padding: '24px 0',
              background: INK,
              border: 'none',
              color: '#eef3f9',
              fontWeight: 700,
              fontSize: 19,
              letterSpacing: '0.14em',
              opacity: onSettings ? 1 : 0.4,
              cursor: onSettings ? 'pointer' : 'not-allowed',
            }}
          >
            <Settings size={15} strokeWidth={2.2} />
            CHANGE SETTINGS
          </button>
        </div>
      )}
    </div>
  )
}
