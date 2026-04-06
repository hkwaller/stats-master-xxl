'use client'

/**
 * Shared "TV screen" view — display-only, no input.
 * Open this on a projector/laptop while players use /player/[id] on their phones.
 * The host's player page drives the game state machine.
 */

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStorage } from '@/lib/liveblocks/client'
import { StatsCard } from '@/components/game/StatsCard'
import { Scoreboard } from '@/components/game/Scoreboard'
import { GameLogo, TierBadge } from '@/components/design-system'
import type { Player, Question } from '@/types/game'

interface GamePageProps {
  params: Promise<{ roomId: string }>
}

export default function GamePage({ params: paramsPromise }: GamePageProps) {
  const [roomId, setRoomId] = useState('')
  const game = useStorage((root) => root.game)

  useEffect(() => {
    paramsPromise.then(({ roomId }) => setRoomId(roomId))
  }, [paramsPromise])

  if (!game) return null

  const players = (game.players as unknown as Player[]) ?? []
  const answeredCount = Object.keys(game.answers ?? {}).length
  const connectedCount = players.filter((p) => p.isConnected).length
  const currentQuestion = game.currentQuestion as unknown as Question | null

  return (
    <main className="game-bg-pattern min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-game-card-border bg-game-bg/80 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
        <GameLogo />
        <div className="flex items-center gap-4 text-sm text-game-text-muted">
          {currentQuestion && <TierBadge tier={currentQuestion.difficulty} />}
          <span>Q {(game.currentQuestionIndex ?? 0) + 1} / {game.questionCount}</span>
          <span className="text-ice-blue font-bold tracking-widest">{roomId}</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden p-6 gap-6">
        {/* Main area */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 bg-white border-4 border-black shadow-[12px_12px_0_#000] relative">

          <AnimatePresence>
            {game.command === 'starting' && (
              <motion.div
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="text-center"
              >
                <div className="text-9xl font-bold tabular-nums text-game-gold">
                  {game.countdownTime || '🏒'}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {(game.command === 'answering' || game.command === 'revealing') && currentQuestion && (
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                className="w-full max-w-3xl"
              >
                <StatsCard question={currentQuestion} revealedColumns={game.revealedColumns ?? 0} />
              </motion.div>
            )}
          </AnimatePresence>

          {game.command === 'answering' && (
            <div className="flex items-center gap-3">
              <div className="h-2 bg-game-card-dark rounded-full w-56 overflow-hidden">
                <motion.div
                  className="h-full bg-ice-blue rounded-full"
                  animate={{ width: `${(answeredCount / Math.max(connectedCount, 1)) * 100}%` }}
                />
              </div>
              <span className="text-sm text-game-text-muted">{answeredCount}/{connectedCount} answered</span>
            </div>
          )}

          <AnimatePresence>
            {game.command === 'revealing' && currentQuestion && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center bg-game-card border border-ice-blue/30 rounded-2xl p-8"
              >
                <p className="text-game-text-muted text-sm uppercase tracking-widest mb-2">The answer was</p>
                <h2 className="text-5xl font-bold text-ice-blue">
                  {currentQuestion.firstName} {currentQuestion.lastName}
                </h2>
                <p className="text-game-text-muted mt-2">{currentQuestion.season} · {currentQuestion.teamNames}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {game.command === 'finished' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                <div className="text-7xl mb-4">🏆</div>
                <h2 className="text-5xl font-bold uppercase tracking-widest text-game-gold">Game Over!</h2>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar */}
        <aside className="w-72 bg-white border-4 border-black shadow-[12px_12px_0_#000] p-5 overflow-y-auto">
          <h3 className="text-sm font-bold uppercase tracking-widest text-black mb-4 border-b-4 border-black pb-2">Scoreboard</h3>
          <Scoreboard
            players={players}
            variant={game.command === 'finished' ? 'final' : 'live'}
          />
        </aside>
      </div>
    </main>
  )
}
