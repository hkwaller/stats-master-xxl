'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { Player } from '@/types/game'
import { Avatar } from '@/components/design-system'

interface ScoreboardProps {
  players: Player[]
  variant?: 'live' | 'final'
  myId?: string
}

export function Scoreboard({ players, variant = 'live', myId }: ScoreboardProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score)

  if (variant === 'final') {
    return <FinalScoreboard players={sorted} myId={myId} />
  }

  return <LiveScoreboard players={sorted} myId={myId} />
}

// ─── Live variant ─────────────────────────────────────────────────────────────

function LiveScoreboard({ players, myId }: { players: Player[]; myId?: string }) {
  return (
    <div className="space-y-2">
      <AnimatePresence>
        {players.map((player, rank) => (
          <motion.div
            key={player.id}
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`
              flex items-center gap-3 px-4 py-2.5 rounded-xl
              ${
                player.id === myId
                  ? 'bg-ice-blue/15 border border-ice-blue/30'
                  : 'bg-game-card-dark border border-game-card-border'
              }
            `}
          >
            <span className="text-sm font-bold text-game-text-muted w-5 text-center">
              {rank + 1}
            </span>
            <Avatar url={player.avatarUrl} name={player.name} size={32} />
            <span className="flex-1 font-bold text-sm truncate">{player.name}</span>
            {player.isHost && (
              <span className="text-xs text-game-gold uppercase tracking-wide">Host</span>
            )}
            <motion.span
              key={player.score}
              initial={{ scale: 1.3, color: '#00b4d8' }}
              animate={{ scale: 1, color: '#ffffff' }}
              transition={{ duration: 0.3 }}
              className="font-bold tabular-nums text-sm"
            >
              {player.score}
            </motion.span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// ─── Final variant (podium) ──────────────────────────────────────────────────

const podiumConfig = [
  { rank: 1, height: 'h-28', color: 'bg-game-gold', emoji: '🥇' },
  { rank: 2, height: 'h-20', color: 'bg-ice-blue', emoji: '🥈' },
  { rank: 3, height: 'h-14', color: 'bg-white-ice/60', emoji: '🥉' },
]

function FinalScoreboard({ players, myId }: { players: Player[]; myId?: string }) {
  const top3 = players.slice(0, 3)
  // Reorder to podium display: 2nd, 1st, 3rd
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean)
  const podiumRanks = [2, 1, 3]
  const rest = players.slice(3)

  return (
    <div className="space-y-8">
      {/* Podium */}
      <div className="flex items-end justify-center gap-4">
        {podiumOrder.map((player, i) => {
          if (!player) return null
          const rank = podiumRanks[i]
          const cfg = podiumConfig.find((c) => c.rank === rank)!

          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15, type: 'spring', stiffness: 200 }}
              className="flex flex-col items-center gap-2"
            >
              <span className="text-2xl">{cfg.emoji}</span>
              <Avatar url={player.avatarUrl} name={player.name} size={56} />
              <span className="font-bold text-sm text-center max-w-[80px] truncate">
                {player.name}
              </span>
              <span className="text-game-text-muted text-sm tabular-nums">{player.score} pts</span>
              <div className={`w-20 rounded-t-lg ${cfg.height} ${cfg.color} opacity-80`} />
            </motion.div>
          )
        })}
      </div>

      {/* Rest of players */}
      {rest.length > 0 && (
        <div className="space-y-2">
          {rest.map((player, i) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.05 }}
              className={`
                flex items-center gap-3 px-4 py-2.5 rounded-xl
                ${
                  player.id === myId
                    ? 'bg-ice-blue/15 border border-ice-blue/30'
                    : 'bg-game-card-dark border border-game-card-border'
                }
              `}
            >
              <span className="text-sm font-bold text-game-text-muted w-5 text-center">
                {i + 4}
              </span>
              <Avatar url={player.avatarUrl} name={player.name} size={32} />
              <span className="flex-1 font-bold text-sm truncate">{player.name}</span>
              <span className="font-bold tabular-nums text-sm">{player.score}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
