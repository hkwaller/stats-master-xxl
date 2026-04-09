'use client'

/**
 * Shared "TV screen" view — display-only, no input.
 * Open this on a projector/laptop while players use /player/[id] on their phones.
 * When host is not playing (hostPlays=false), this page also drives the state machine.
 */

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useStorage } from '@/lib/liveblocks/client'
import {
  useAdvanceToNext,
  useNextCareerRound,
  useNextH2HRound,
  useNextHLRound,
  useNextQuestion,
  useRematch,
  useRevealAnswers,
  useRevealCareerAnswer,
  useRevealH2HAnswers,
  useRevealHLAnswers,
  useRevealNextCareerSeason,
  useSkipQuestion,
  useTickCountdown,
} from '@/lib/liveblocks/mutations'
import { getOrCreateGuest } from '@/lib/guest'
import { useHostStateMachine } from '@/hooks/useHostStateMachine'
import Dock from '@/components/ui/Dock'
import { StatsCard } from '@/components/game/StatsCard'
import { Scoreboard } from '@/components/game/Scoreboard'
import { CareerRevealCard } from '@/components/game/CareerRevealCard'
import { H2HComparisonCard } from '@/components/game/H2HComparisonCard'
import { HigherLowerCard } from '@/components/game/HigherLowerCard'
import { GameLogo, TierBadge } from '@/components/design-system'
import { Eye, SkipForward, ChevronRight, RotateCcw, Settings } from 'lucide-react'
import type { H2HPair, HLPair, Player, Question } from '@/types/game'

interface GamePageProps {
  params: Promise<{ roomId: string }>
}

const MODE_LABELS: Record<string, string> = {
  classic: 'Classic',
  career: 'Career',
  h2h: 'Head-to-Head',
  'higher-lower': 'Higher or Lower',
}

export default function GamePage({ params: paramsPromise }: GamePageProps) {
  const router = useRouter()
  const [roomId, setRoomId] = useState('')
  const [myId, setMyId] = useState('')
  const game = useStorage((root) => root.game)

  // Mutations (needed when host is not playing and drives the machine from here)
  const tickCountdown = useTickCountdown()
  const nextQuestion = useNextQuestion()
  const nextCareerRound = useNextCareerRound()
  const revealNextCareerSeason = useRevealNextCareerSeason()
  const revealCareerAnswer = useRevealCareerAnswer()
  const nextH2HRound = useNextH2HRound()
  const nextHLRound = useNextHLRound()
  const revealAnswers = useRevealAnswers()
  const revealH2HAnswers = useRevealH2HAnswers()
  const revealHLAnswers = useRevealHLAnswers()
  const advanceToNext = useAdvanceToNext()
  const skipQuestion = useSkipQuestion()
  const rematch = useRematch()

  useEffect(() => {
    paramsPromise.then(({ roomId }) => setRoomId(roomId))
    const guest = getOrCreateGuest()
    setMyId(guest.id)
  }, [paramsPromise])

  const isHost = game?.hostId === myId
  const isBoss = game?.bossId === myId
  const isController = isHost || isBoss

  // Drive the state machine from the game page when host is not playing
  useHostStateMachine(isHost, myId, game as unknown as import('@/types/game').GameState | null, {
    tickCountdown,
    nextQuestion,
    nextCareerRound,
    revealNextCareerSeason,
    revealCareerAnswer,
    nextH2HRound,
    nextHLRound,
    revealAnswers,
    revealH2HAnswers,
    revealHLAnswers,
  })

  // Redirect everyone to lobby on rematch
  useEffect(() => {
    if (!game || game.command !== 'rematch') return
    router.push(`/${roomId}/lobby`)
  }, [game?.command])

  if (!game) return null

  const players = (game.players as unknown as Player[]) ?? []
  const answeredCount = Object.keys(game.answers ?? {}).length
  const connectedCount = players.filter((p) => p.isConnected).length
  const currentQuestion = game.currentQuestion as unknown as Question | null
  const gameMode = game.gameMode ?? 'classic'
  const isActive = game.command === 'answering' || game.command === 'revealing'

  // Career mode
  const careerSeasons = (game.careerSeasons as unknown as Question[]) ?? []
  const revealedSeasonCount = game.revealedSeasonCount ?? 0
  const buzzedInPlayerId = game.buzzedInPlayerId ?? ''
  const lockedOutPlayers = (game.lockedOutPlayers as unknown as string[]) ?? []
  const buzzedInPlayer = players.find((p) => p.id === buzzedInPlayerId)

  // H2H mode
  const h2hCurrentPair = game.h2hCurrentPair as unknown as H2HPair | null

  // HL mode
  const hlCurrentPair = game.hlCurrentPair as unknown as HLPair | null

  return (
    <main className="game-bg-pattern min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-game-card-border bg-game-bg/80 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
        <GameLogo />
        <div className="flex items-center gap-4 text-sm text-game-text-muted">
          <span className="text-xs font-bold uppercase tracking-widest bg-magenta/20 text-magenta px-2 py-0.5 border border-magenta/30">
            {MODE_LABELS[gameMode] ?? gameMode}
          </span>
          {currentQuestion && gameMode === 'classic' && (
            <TierBadge tier={currentQuestion.difficulty} />
          )}
          <span>
            Q {(game.currentQuestionIndex ?? 0) + 1} / {game.questionCount}
          </span>
          <span className="text-ice-blue font-bold tracking-widest">{roomId}</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden p-6 gap-6">
        {/* Main area */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 bg-white border-4 border-black shadow-[12px_12px_0_#000] relative">
          {/* Countdown */}
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

          {/* Classic mode */}
          <AnimatePresence>
            {isActive && gameMode === 'classic' && currentQuestion && (
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

          {/* Career mode */}
          <AnimatePresence>
            {isActive && gameMode === 'career' && careerSeasons.length > 0 && (
              <motion.div
                key={`career-${game.currentQuestionIndex}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                className="w-full max-w-3xl"
              >
                <CareerRevealCard
                  seasons={careerSeasons}
                  revealedCount={revealedSeasonCount}
                  buzzedInPlayerName={buzzedInPlayer?.name}
                  lockedOutCount={lockedOutPlayers.length}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* H2H mode */}
          <AnimatePresence>
            {isActive && gameMode === 'h2h' && h2hCurrentPair && (
              <motion.div
                key={`h2h-${game.currentQuestionIndex}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                className="w-full max-w-3xl"
              >
                <H2HComparisonCard pair={h2hCurrentPair} revealed={game.command === 'revealing'} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Higher/Lower mode */}
          <AnimatePresence>
            {isActive && gameMode === 'higher-lower' && hlCurrentPair && (
              <motion.div
                key={`hl-${game.currentQuestionIndex}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                className="w-full max-w-3xl"
              >
                <HigherLowerCard pair={hlCurrentPair} revealed={game.command === 'revealing'} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Answer progress (classic / h2h / hl) */}
          {game.command === 'answering' && gameMode !== 'career' && (
            <div className="flex items-center gap-3">
              <div className="h-2 bg-game-card-dark rounded-full w-56 overflow-hidden">
                <motion.div
                  className="h-full bg-ice-blue rounded-full"
                  animate={{
                    width: `${(answeredCount / Math.max(connectedCount, 1)) * 100}%`,
                  }}
                />
              </div>
              <span className="text-sm text-game-text-muted">
                {answeredCount}/{connectedCount} answered
              </span>
            </div>
          )}

          {/* Reveal: correct answer display */}
          <AnimatePresence>
            {game.command === 'revealing' && currentQuestion && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center bg-game-card border border-ice-blue/30 rounded-2xl p-8"
              >
                {gameMode === 'classic' || gameMode === 'career' ? (
                  <>
                    <p className="text-game-text-muted text-sm uppercase tracking-widest mb-2">
                      The answer was
                    </p>
                    <h2 className="text-5xl font-bold text-ice-blue">
                      {currentQuestion.firstName} {currentQuestion.lastName}
                    </h2>
                    {gameMode === 'classic' && (
                      <p className="text-game-text-muted mt-2">
                        {currentQuestion.season} · {currentQuestion.teamNames}
                      </p>
                    )}
                  </>
                ) : gameMode === 'h2h' && h2hCurrentPair ? (
                  <>
                    <p className="text-game-text-muted text-sm uppercase tracking-widest mb-2">
                      Correct answer
                    </p>
                    <h2 className="text-3xl font-bold text-ice-blue">
                      Player {h2hCurrentPair.correctSide === 'left' ? 'A (Left)' : 'B (Right)'}
                    </h2>
                    <p className="text-game-text-muted mt-1">{h2hCurrentPair.targetName}</p>
                  </>
                ) : gameMode === 'higher-lower' && hlCurrentPair ? (
                  <>
                    <p className="text-game-text-muted text-sm uppercase tracking-widest mb-2">
                      The answer was
                    </p>
                    <h2 className="text-5xl font-bold text-ice-blue capitalize">
                      {hlCurrentPair.correctAnswer}
                    </h2>
                    <p className="text-game-text-muted mt-2">
                      {hlCurrentPair.challengeValue} vs {hlCurrentPair.referenceValue}{' '}
                      {hlCurrentPair.field}
                    </p>
                  </>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Game over */}
          <AnimatePresence>
            {game.command === 'finished' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <div className="text-7xl mb-4">🏆</div>
                <h2 className="text-5xl font-bold uppercase tracking-widest text-game-gold">
                  Game Over!
                </h2>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar scoreboard */}
        <aside className="w-72 bg-white border-4 border-black shadow-[12px_12px_0_#000] p-5 overflow-y-auto">
          <h3 className="text-sm font-bold uppercase tracking-widest text-black mb-4 border-b-4 border-black pb-2">
            Scoreboard
          </h3>
          <Scoreboard players={players} variant={game.command === 'finished' ? 'final' : 'live'} />
        </aside>
      </div>

      {/* ── Controller Dock (only visible when viewing as host/boss) ── */}
      {isController && (
        <GamePageDock
          game={game as unknown as import('@/types/game').GameState}
          gameMode={gameMode}
          isBoss={isBoss}
          onReveal={() => {
            if (gameMode === 'career') revealCareerAnswer(myId)
            else if (gameMode === 'h2h') revealH2HAnswers(myId)
            else if (gameMode === 'higher-lower') revealHLAnswers(myId)
            else revealAnswers(myId)
          }}
          onSkip={() => skipQuestion(myId)}
          onNext={() => advanceToNext(myId)}
          onRematch={() => rematch(myId)}
          onSettings={() => router.push(`/${roomId}/setup`)}
        />
      )}
    </main>
  )
}

// ─── Game Page Dock ───────────────────────────────────────────────────────────

function GamePageDock({
  game,
  gameMode,
  isBoss,
  onReveal,
  onSkip,
  onNext,
  onRematch,
  onSettings,
}: {
  game: import('@/types/game').GameState | null
  gameMode: string
  isBoss: boolean
  onReveal: () => void
  onSkip: () => void
  onNext: () => void
  onRematch: () => void
  onSettings: () => void
}) {
  if (!game) return null

  const command = game.command as string
  const nextLabel = gameMode === 'classic' ? 'Next Question' : 'Next Round'

  type Item = {
    icon: React.ReactNode
    label: React.ReactNode
    onClick: () => void
    className?: string
  }
  const items: Item[] = []

  if (command === 'answering') {
    items.push({
      icon: <Eye size={24} />,
      label: 'Reveal',
      onClick: onReveal,
      className: 'bg-game-red border-2 border-black text-white',
    })
    items.push({
      icon: <SkipForward size={24} />,
      label: 'Skip',
      onClick: onSkip,
      className: 'bg-yellow border-2 border-black text-black',
    })
  }

  if (command === 'revealing') {
    items.push({
      icon: <ChevronRight size={24} />,
      label: nextLabel,
      onClick: onNext,
      className: 'bg-cyan border-2 border-black text-black',
    })
  }

  if (command === 'finished') {
    items.push({
      icon: <RotateCcw size={24} />,
      label: 'Play Again',
      onClick: onRematch,
      className: 'bg-magenta border-2 border-black text-white',
    })
    items.push({
      icon: <Settings size={24} />,
      label: 'Settings',
      onClick: onSettings,
      className: 'bg-white border-2 border-black text-black',
    })
  }

  if (items.length === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 flex flex-col items-center pb-4 pointer-events-none z-50">
      <div className="pointer-events-auto">
        <Dock items={items} baseItemSize={52} magnification={68} panelHeight={68} distance={130} />
      </div>
    </div>
  )
}
