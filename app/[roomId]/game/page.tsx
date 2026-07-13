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
import { TierBadge, CountdownRing } from '@/components/design-system'
import { CBrand, RinkBg } from '@/components/arcade'
import { Eye, SkipForward, ChevronRight, RotateCcw, Settings } from 'lucide-react'
import type { H2HPair, HLPair, Player, Question } from '@/types/game'

interface GamePageProps {
  params: Promise<{ roomId: string }>
}

const MODE_LABELS: Record<string, string> = {
  classic:       'Classic',
  career:        'Career',
  h2h:           'Head-to-Head',
  'higher-lower':'Higher or Lower',
}

export default function GamePage({ params: paramsPromise }: GamePageProps) {
  const router = useRouter()
  const [roomId, setRoomId] = useState('')
  const [myId, setMyId] = useState('')
  const game = useStorage((root) => root.game)

  const tickCountdown         = useTickCountdown()
  const nextQuestion          = useNextQuestion()
  const nextCareerRound       = useNextCareerRound()
  const revealNextCareerSeason = useRevealNextCareerSeason()
  const revealCareerAnswer    = useRevealCareerAnswer()
  const nextH2HRound          = useNextH2HRound()
  const nextHLRound           = useNextHLRound()
  const revealAnswers         = useRevealAnswers()
  const revealH2HAnswers      = useRevealH2HAnswers()
  const revealHLAnswers       = useRevealHLAnswers()
  const advanceToNext         = useAdvanceToNext()
  const skipQuestion          = useSkipQuestion()
  const rematch               = useRematch()

  useEffect(() => {
    paramsPromise.then(({ roomId }) => setRoomId(roomId))
    const guest = getOrCreateGuest()
    setMyId(guest.id)
  }, [paramsPromise])

  const isHost       = game?.hostId === myId
  const isBoss       = game?.bossId === myId
  const isController = isHost || isBoss

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

  useEffect(() => {
    if (!game || game.command !== 'rematch') return
    router.push(`/${roomId}/lobby`)
  }, [game?.command])

  if (!game) return null

  const players        = (game.players as unknown as Player[]) ?? []
  const topPlayer      = players.length
    ? players.reduce((top, p) => ((p.score ?? 0) > (top.score ?? 0) ? p : top), players[0])
    : null
  const leaderId       = topPlayer && (topPlayer.score ?? 0) > 0 ? topPlayer.id : ''
  const choices        = (game.choices as unknown as string[]) ?? []
  const answeredCount  = Object.keys(game.answers ?? {}).length
  const connectedCount = players.filter((p) => p.isConnected).length
  const currentQuestion = game.currentQuestion as unknown as Question | null
  const gameMode       = game.gameMode ?? 'classic'
  const isActive       = game.command === 'answering' || game.command === 'revealing'

  const careerSeasons      = (game.careerSeasons as unknown as Question[]) ?? []
  const revealedSeasonCount = game.revealedSeasonCount ?? 0
  const buzzedInPlayerId   = game.buzzedInPlayerId ?? ''
  const lockedOutPlayers   = (game.lockedOutPlayers as unknown as string[]) ?? []
  const buzzedInPlayer     = players.find((p) => p.id === buzzedInPlayerId)

  const h2hCurrentPair = game.h2hCurrentPair as unknown as H2HPair | null
  const hlCurrentPair  = game.hlCurrentPair as unknown as HLPair | null

  const timeLeft = game.countdownTime ?? 30

  return (
    <main
      className="ice-bg min-h-screen flex flex-col"
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {/* Rink background overlay */}
      <RinkBg opacity={0.06} />

      {/* ── Top scoreboard strip (floating navy bar) ── */}
      <header
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: 1180,
          width: 'calc(100% - 44px)',
          margin: '16px auto 0',
          background: '#0a1535',
          color: '#fff',
          borderRadius: 14,
          padding: '10px 16px',
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          gap: 16,
          alignItems: 'center',
          boxShadow: '0 4px 0 rgba(10,21,53,0.25)',
        }}
      >
        {/* Brand */}
        <CBrand small light subtitle="ARCADE MODE" />

        {/* Player chips */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            justifyContent: 'center',
            overflow: 'hidden',
            flexWrap: 'wrap',
          }}
        >
          {players.map((p) => {
            const isLeader = p.id === leaderId
            return (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '5px 10px 5px 6px',
                  borderRadius: 9999,
                  background: isLeader ? '#e32437' : 'rgba(255,255,255,0.08)',
                  border: isLeader ? '2px solid #0a1535' : '2px solid transparent',
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    overflow: 'hidden',
                    flexShrink: 0,
                    border: '1.5px solid rgba(0,0,0,0.3)',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.avatarUrl} alt={p.name} width={20} height={20} className="w-full h-full object-cover" />
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-archivo-black), sans-serif',
                    fontSize: 9,
                    letterSpacing: '0.08em',
                    color: '#fff',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.name}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-bungee), sans-serif',
                    fontSize: 12,
                    color: isLeader ? '#fff' : '#ffcf33',
                    lineHeight: 1,
                  }}
                >
                  {p.score ?? 0}
                </span>
              </div>
            )
          })}
        </div>

        {/* Mode + room code */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              background: '#e32437',
              color: '#fff',
              border: '2px solid #0a1535',
              borderRadius: 9999,
              padding: '5px 12px',
              fontFamily: 'var(--font-archivo-black), sans-serif',
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: '0.14em',
              whiteSpace: 'nowrap',
            }}
          >
            {(MODE_LABELS[gameMode] ?? gameMode).toUpperCase()}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-jetbrains-mono), monospace',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.2em',
              color: '#9db9f0',
              whiteSpace: 'nowrap',
            }}
          >
            {roomId}
          </span>
        </div>
      </header>

      {/* ── Main content ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '14px 22px 22px',
          gap: 14,
          maxWidth: 1180,
          margin: '0 auto',
          width: '100%',
        }}
      >
        {/* Starting countdown overlay */}
        <AnimatePresence>
          {game.command === 'starting' && (
            <motion.div
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              style={{ textAlign: 'center', padding: '40px 0' }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
                  fontSize: 140,
                  lineHeight: 1,
                  color: '#e32437',
                  textShadow: '0 8px 0 rgba(227,36,55,0.3)',
                }}
              >
                {game.countdownTime || '🏒'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Classic mode ── */}
        <AnimatePresence>
          {isActive && gameMode === 'classic' && currentQuestion && (
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              {/* Question bar */}
              <div
                style={{
                  background: '#fff',
                  border: '2px solid #0a1535',
                  borderRadius: 14,
                  padding: '10px 18px',
                  boxShadow: '0 4px 0 #0a1535',
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto auto',
                  gap: 14,
                  alignItems: 'center',
                }}
              >
                {/* Q chip */}
                <span
                  style={{
                    background: '#e32437',
                    color: '#fff',
                    border: '2px solid #0a1535',
                    borderRadius: 8,
                    padding: '4px 10px',
                    fontFamily: 'var(--font-archivo-black), sans-serif',
                    fontSize: 12,
                    fontWeight: 900,
                    letterSpacing: '0.16em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Q {(game.currentQuestionIndex ?? 0) + 1}/{game.questionCount}
                </span>

                {/* Title + difficulty */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
                      fontSize: 22,
                      color: '#0a1535',
                    }}
                  >
                    WHO'S THIS?
                  </span>
                  <TierBadge tier={currentQuestion.difficulty} />
                </div>

                {/* Answered count */}
                {game.command === 'answering' && (
                  <span
                    style={{
                      fontFamily: 'var(--font-jetbrains-mono), monospace',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#6b7ea0',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {answeredCount}/{connectedCount} in
                  </span>
                )}

                {/* Countdown ring */}
                <CountdownRing seconds={timeLeft} total={30} size={90} />
              </div>

              {/* Stat tiles */}
              <StatsCard
                question={currentQuestion}
                revealedColumns={game.revealedColumns ?? 0}
              />

              {/* Answer grid (multiple choice) */}
              {game.answerMode === 'multiplechoice' && choices.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                  }}
                >
                  {choices.map((choice, i) => {
                    const letter = ['A', 'B', 'C', 'D'][i] ?? '?'
                    const letterBg = ['#e32437', '#003087', '#2cc66b', '#ffcf33'][i] ?? '#0a1535'
                    const letterFg = i === 3 ? '#0a1535' : '#ffffff'
                    const isCorrect =
                      game.command === 'revealing' &&
                      choice.trim().toLowerCase() ===
                        `${currentQuestion.firstName} ${currentQuestion.lastName}`.trim().toLowerCase()
                    return (
                      <div
                        key={`${choice}-${i}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: 12,
                          background: isCorrect ? '#003087' : '#fff',
                          border: '2px solid #0a1535',
                          borderRadius: 14,
                          boxShadow: isCorrect ? '0 5px 0 #0a1535' : '0 4px 0 #0a1535',
                        }}
                      >
                        <span
                          style={{
                            width: 42,
                            height: 42,
                            flexShrink: 0,
                            display: 'grid',
                            placeItems: 'center',
                            background: letterBg,
                            color: letterFg,
                            border: '2px solid #0a1535',
                            borderRadius: 10,
                            fontFamily: 'var(--font-bungee), sans-serif',
                            fontSize: 18,
                          }}
                        >
                          {letter}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-bungee), sans-serif',
                            fontSize: 19,
                            color: isCorrect ? '#fff' : '#0a1535',
                            lineHeight: 1,
                          }}
                        >
                          {choice}
                        </span>
                        {isCorrect && (
                          <span
                            style={{
                              marginLeft: 'auto',
                              background: '#ffcf33',
                              color: '#0a1535',
                              border: '2px solid #0a1535',
                              borderRadius: 8,
                              padding: '2px 8px',
                              fontFamily: 'var(--font-archivo-black), sans-serif',
                              fontSize: 10,
                              letterSpacing: '0.1em',
                              transform: 'rotate(4deg)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            ✓ CORRECT
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Career mode ── */}
        <AnimatePresence>
          {isActive && gameMode === 'career' && careerSeasons.length > 0 && (
            <motion.div
              key={`career-${game.currentQuestionIndex}`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="w-full"
            >
              <div className="card-puffy bg-white p-6">
                <CareerRevealCard
                  seasons={careerSeasons}
                  revealedCount={revealedSeasonCount}
                  buzzedInPlayerName={buzzedInPlayer?.name}
                  lockedOutCount={lockedOutPlayers.length}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── H2H mode ── */}
        <AnimatePresence>
          {isActive && gameMode === 'h2h' && h2hCurrentPair && (
            <motion.div
              key={`h2h-${game.currentQuestionIndex}`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="w-full"
            >
              <div className="card-puffy bg-white p-6">
                <H2HComparisonCard pair={h2hCurrentPair} revealed={game.command === 'revealing'} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Higher/Lower mode ── */}
        <AnimatePresence>
          {isActive && gameMode === 'higher-lower' && hlCurrentPair && (
            <motion.div
              key={`hl-${game.currentQuestionIndex}`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="w-full"
            >
              <div className="card-puffy bg-white p-6">
                <HigherLowerCard pair={hlCurrentPair} revealed={game.command === 'revealing'} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Reveal: correct answer ── */}
        <AnimatePresence>
          {game.command === 'revealing' && currentQuestion && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="card-puffy bg-white text-center"
              style={{ padding: '32px 48px', maxWidth: 520, alignSelf: 'center' }}
            >
              {gameMode === 'classic' || gameMode === 'career' ? (
                <>
                  <p
                    style={{
                      fontFamily: 'var(--font-jetbrains-mono), monospace',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.22em',
                      color: '#6b7ea0',
                      textTransform: 'uppercase',
                      marginBottom: 10,
                    }}
                  >
                    The answer was
                  </p>
                  <h2
                    style={{
                      fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
                      fontSize: 52,
                      lineHeight: 0.9,
                      color: '#0a1535',
                      margin: 0,
                    }}
                  >
                    {currentQuestion.firstName} {currentQuestion.lastName}
                  </h2>
                  {gameMode === 'classic' && (
                    <p
                      style={{
                        fontFamily: 'var(--font-jetbrains-mono), monospace',
                        fontSize: 12,
                        color: '#6b7ea0',
                        marginTop: 10,
                      }}
                    >
                      {currentQuestion.season} · {currentQuestion.teamNames}
                    </p>
                  )}
                </>
              ) : gameMode === 'h2h' && h2hCurrentPair ? (
                <>
                  <p
                    style={{
                      fontFamily: 'var(--font-jetbrains-mono), monospace',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.22em',
                      color: '#6b7ea0',
                      textTransform: 'uppercase',
                      marginBottom: 10,
                    }}
                  >
                    Correct answer
                  </p>
                  <h2
                    style={{
                      fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
                      fontSize: 36,
                      color: '#0a1535',
                      margin: 0,
                    }}
                  >
                    Player {h2hCurrentPair.correctSide === 'left' ? 'A (Left)' : 'B (Right)'}
                  </h2>
                  <p
                    style={{
                      fontFamily: 'var(--font-jetbrains-mono), monospace',
                      fontSize: 13,
                      color: '#6b7ea0',
                      marginTop: 8,
                    }}
                  >
                    {h2hCurrentPair.targetName}
                  </p>
                </>
              ) : gameMode === 'higher-lower' && hlCurrentPair ? (
                <>
                  <p
                    style={{
                      fontFamily: 'var(--font-jetbrains-mono), monospace',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.22em',
                      color: '#6b7ea0',
                      textTransform: 'uppercase',
                      marginBottom: 10,
                    }}
                  >
                    The answer was
                  </p>
                  <h2
                    style={{
                      fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
                      fontSize: 52,
                      lineHeight: 0.9,
                      color: '#0a1535',
                      textTransform: 'capitalize',
                      margin: 0,
                    }}
                  >
                    {hlCurrentPair.correctAnswer}
                  </h2>
                  <p
                    style={{
                      fontFamily: 'var(--font-jetbrains-mono), monospace',
                      fontSize: 12,
                      color: '#6b7ea0',
                      marginTop: 10,
                    }}
                  >
                    {hlCurrentPair.challengeValue} vs {hlCurrentPair.referenceValue} {hlCurrentPair.field}
                  </p>
                </>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Game over ── */}
        <AnimatePresence>
          {game.command === 'finished' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 24,
                width: '100%',
              }}
            >
              <div style={{ fontSize: 80 }}>🏆</div>
              <h2
                style={{
                  fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
                  fontSize: 72,
                  lineHeight: 0.9,
                  color: '#e32437',
                  margin: 0,
                  textShadow: '0 6px 0 rgba(227,36,55,0.25)',
                }}
              >
                GAME OVER!
              </h2>
              <div className="card-puffy bg-white" style={{ padding: 24, maxWidth: 480, width: '100%' }}>
                <Scoreboard
                  players={players}
                  variant="final"
                  myId={myId}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Controller Dock ── */}
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

  const command   = game.command as string
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
      className: 'bg-c-red border-2 border-c-ink text-white',
    })
    items.push({
      icon: <SkipForward size={24} />,
      label: 'Skip',
      onClick: onSkip,
      className: 'bg-c-yellow border-2 border-c-ink text-c-ink',
    })
  }

  if (command === 'revealing') {
    items.push({
      icon: <ChevronRight size={24} />,
      label: nextLabel,
      onClick: onNext,
      className: 'bg-c-navy border-2 border-c-ink text-white',
    })
  }

  if (command === 'finished') {
    items.push({
      icon: <RotateCcw size={24} />,
      label: 'Play Again',
      onClick: onRematch,
      className: 'bg-c-red border-2 border-c-ink text-white',
    })
    items.push({
      icon: <Settings size={24} />,
      label: 'Settings',
      onClick: onSettings,
      className: 'bg-white border-2 border-c-ink text-c-ink',
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
