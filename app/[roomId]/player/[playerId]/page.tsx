'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useStorage } from '@/lib/liveblocks/client'
import {
  useAdvanceToNext,
  useBuzzIn,
  useNextCareerRound,
  useNextH2HRound,
  useNextHLRound,
  useNextQuestion,
  useRematch,
  useRequestHint,
  useActivatePowerup,
  useRevealAnswers,
  useRevealCareerAnswer,
  useRevealH2HAnswers,
  useRevealHLAnswers,
  useRevealNextCareerSeason,
  useSkipQuestion,
  useSubmitAnswer,
  useSubmitCareerAnswer,
  useTickCountdown,
} from '@/lib/liveblocks/mutations'
import { getOrCreateGuest } from '@/lib/guest'
import { useHostStateMachine } from '@/hooks/useHostStateMachine'
import Dock from '@/components/ui/Dock'
import { StatsCard } from '@/components/game/StatsCard'
import { CareerRevealCard } from '@/components/game/CareerRevealCard'
import { BuzzInButton } from '@/components/game/BuzzInButton'
import { H2HComparisonCard } from '@/components/game/H2HComparisonCard'
import { HigherLowerCard } from '@/components/game/HigherLowerCard'
import { PlayerGuessInput } from '@/components/game/PlayerGuessInput'
import { Scoreboard } from '@/components/game/Scoreboard'
import { PowerupBar } from '@/components/game/PowerupBar'
import { HintPanel } from '@/components/game/HintPanel'
import { Avatar, Button, GameLogo, TierBadge } from '@/components/design-system'
import { getAvatarUrl } from '@/lib/avatar'
import { Eye, SkipForward, ChevronRight, RotateCcw, Settings } from 'lucide-react'
import type {
  H2HPair,
  HintType,
  HLPair,
  Player,
  PowerupType,
  Question,
  QuestionResult,
} from '@/types/game'
import { POWERUP_INITIAL_CHARGES } from '@/types/game'

interface PlayerPageProps {
  params: Promise<{ roomId: string; playerId: string }>
}

export default function PlayerPage({ params: paramsPromise }: PlayerPageProps) {
  const router = useRouter()
  const [roomId, setRoomId] = useState('')
  const [playerId, setPlayerId] = useState('')
  const [myId, setMyId] = useState('')

  const game = useStorage((root) => root.game)

  // ── Mutations ────────────────────────────────────────────────────────────────
  const submitAnswer = useSubmitAnswer()
  const requestHint = useRequestHint()
  const activatePowerup = useActivatePowerup()
  const advanceToNext = useAdvanceToNext()
  const skipQuestion = useSkipQuestion()
  const revealAnswers = useRevealAnswers()
  const rematch = useRematch()
  const tickCountdown = useTickCountdown()
  const nextQuestion = useNextQuestion()
  // Career
  const nextCareerRound = useNextCareerRound()
  const revealNextCareerSeason = useRevealNextCareerSeason()
  const buzzIn = useBuzzIn()
  const submitCareerAnswer = useSubmitCareerAnswer()
  const revealCareerAnswer = useRevealCareerAnswer()
  // H2H
  const nextH2HRound = useNextH2HRound()
  const revealH2HAnswers = useRevealH2HAnswers()
  // HL
  const nextHLRound = useNextHLRound()
  const revealHLAnswers = useRevealHLAnswers()

  useEffect(() => {
    paramsPromise.then(({ roomId, playerId }) => {
      setRoomId(roomId)
      setPlayerId(playerId)
    })
    const guest = getOrCreateGuest()
    setMyId(guest.id)
  }, [paramsPromise])

  // ── Derived state ─────────────────────────────────────────────────────────────
  const isHost = game?.hostId === myId
  const isBoss = game?.bossId === myId
  const isController = isHost || isBoss
  const gameMode = game?.gameMode ?? 'classic'
  const answeredCount = Object.keys(game?.answers ?? {}).length

  const players = (game?.players as unknown as Player[]) ?? []
  const me = players.find((p) => p.id === myId)
  const myRank = [...players].sort((a, b) => b.score - a.score).findIndex((p) => p.id === myId) + 1

  const hasAnswered = myId ? !!(game?.answers as Record<string, string> | undefined)?.[myId] : false
  const connectedPlayers = players.filter((p) => p.isConnected)

  const currentQuestion = game?.currentQuestion as unknown as Question | null
  const careerSeasons = (game?.careerSeasons as unknown as Question[]) ?? []
  const revealedSeasonCount = game?.revealedSeasonCount ?? 0
  const buzzedInPlayerId = game?.buzzedInPlayerId ?? ''
  const lockedOutPlayers = (game?.lockedOutPlayers as unknown as string[]) ?? []
  const h2hCurrentPair = game?.h2hCurrentPair as unknown as H2HPair | null
  const hlCurrentPair = game?.hlCurrentPair as unknown as HLPair | null

  const sharedHints = ((game?.hintsUsed as unknown as string[]) ?? []) as HintType[]
  const myPowerupCharges: Record<PowerupType, number> = {
    eliminate:
      (game?.playerPowerups as Record<string, Record<string, number>>)?.[myId]?.eliminate ??
      (game?.powerupsEnabled ? POWERUP_INITIAL_CHARGES.eliminate : 0),
    doubledown:
      (game?.playerPowerups as Record<string, Record<string, number>>)?.[myId]?.doubledown ??
      (game?.powerupsEnabled ? POWERUP_INITIAL_CHARGES.doubledown : 0),
    freeze:
      (game?.playerPowerups as Record<string, Record<string, number>>)?.[myId]?.freeze ??
      (game?.powerupsEnabled ? POWERUP_INITIAL_CHARGES.freeze : 0),
    extrahint:
      (game?.playerPowerups as Record<string, Record<string, number>>)?.[myId]?.extrahint ??
      (game?.powerupsEnabled ? POWERUP_INITIAL_CHARGES.extrahint : 0),
  }

  // ── Host-driven state machine ─────────────────────────────────────────────────
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

  // Save played question IDs to localStorage when game finishes (classic/career)
  useEffect(() => {
    if (!game || game.command !== 'finished') return
    const today = new Date().toISOString().slice(0, 10)

    if (gameMode === 'career') {
      const careerDataArr = (game.careerData as unknown as { playerId: number }[]) ?? []
      if (careerDataArr.length === 0) return
      const key = `nhl-career-played-${today}`
      const existing: number[] = JSON.parse(localStorage.getItem(key) ?? '[]')
      const merged = [...new Set([...existing, ...careerDataArr.map((c) => c.playerId)])]
      localStorage.setItem(key, JSON.stringify(merged))
    } else {
      const played = (game.playedQuestions as unknown as Question[]) ?? []
      if (played.length === 0) return
      const key = `nhl-played-${today}`
      const existing: string[] = JSON.parse(localStorage.getItem(key) ?? '[]')
      const merged = [...new Set([...existing, ...played.map((q) => q.id)])]
      localStorage.setItem(key, JSON.stringify(merged))
    }
  }, [game?.command, gameMode])

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function handleAnswer(answer: string) {
    if (!myId) return
    submitAnswer({ playerId: myId, answer })
  }

  function handleHint(type: HintType) {
    requestHint({ hintType: type })
  }

  function handlePowerup(type: PowerupType) {
    if (!myId) return
    activatePowerup({ playerId: myId, powerupType: type })
  }

  function handleBuzzIn() {
    if (!myId) return
    buzzIn({ playerId: myId })
  }

  function handleCareerAnswer(answer: string) {
    if (!myId) return
    submitCareerAnswer({ playerId: myId, answer })
  }

  if (!game) return null

  return (
    <main className="game-bg-pattern min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-game-card-border bg-game-bg/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
        <GameLogo className="text-lg" />
        {me && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="font-bold text-sm tabular-nums">{me.score} pts</div>
              <div className="text-xs text-game-text-muted">Rank #{myRank}</div>
            </div>
            <Avatar url={getAvatarUrl(me.id)} name={me.name} size={36} />
          </div>
        )}
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div
          className={`flex-1 overflow-y-auto px-4 py-6 space-y-5 max-w-lg mx-auto w-full lg:max-w-none lg:mx-0 ${isController ? 'pb-28' : ''} ${gameMode === 'career' && game.command === 'answering' ? 'pb-32' : ''}`}
        >
          {/* Idle */}
          {game.command === 'idle' && (
            <div className="text-center py-16">
              <p className="text-game-text-muted text-lg">Waiting for the game to start…</p>
            </div>
          )}

          {/* Countdown */}
          <AnimatePresence>
            {game.command === 'starting' && (
              <motion.div
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 gap-4"
              >
                <div className="text-[30vw] font-bold text-black tabular-nums">
                  {game.countdownTime || '🏒'}
                </div>
                <p className="text-game-text-muted uppercase tracking-widest">Get ready!</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Classic mode: active question ── */}
          <AnimatePresence mode="wait">
            {(game.command === 'answering' || game.command === 'revealing') &&
              gameMode === 'classic' &&
              currentQuestion && (
                <motion.div
                  key={currentQuestion.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4 bg-white p-8 border-8 border-black"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-game-text-muted">
                      Q {(game.currentQuestionIndex ?? 0) + 1}/{game.questionCount}
                    </span>
                    <TierBadge tier={currentQuestion.difficulty} />
                  </div>

                  <StatsCard
                    question={currentQuestion}
                    revealedColumns={game.revealedColumns ?? 0}
                  />

                  {game.command === 'revealing' &&
                    (() => {
                      const history = (game.questionHistory as unknown as QuestionResult[]) ?? []
                      const latestResult = history.length > 0 ? history[history.length - 1] : null
                      const myResult = latestResult?.playerAnswers?.[myId]
                      const isCorrect = myResult?.correct ?? false
                      const pointsEarned = myResult?.points ?? 0
                      const color = hasAnswered
                        ? isCorrect
                          ? 'bg-lime text-black'
                          : 'bg-game-red text-white'
                        : 'bg-yellow text-black'

                      const prevScores = players.map((p) => {
                        const pts = latestResult?.playerAnswers?.[p.id]?.points ?? 0
                        return { id: p.id, prevScore: p.score - pts }
                      })
                      prevScores.sort((a, b) => b.prevScore - a.prevScore)
                      const prevRank = prevScores.findIndex((p) => p.id === myId) + 1
                      let rankMessage = null
                      if (players.length > 1) {
                        if (myRank < prevRank && prevRank > 0) {
                          rankMessage =
                            myRank === 1 ? 'You took top spot! 🥇' : `Moved up to #${myRank}! 📈`
                        } else if (myRank > prevRank && prevRank > 0) {
                          rankMessage = `Dropped to #${myRank} 📉`
                        } else if (myRank === 1 && prevRank === 1 && history.length > 1) {
                          rankMessage = 'Holding onto #1! 🛡️'
                        }
                      }

                      return (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          className={`${color} border-8 border-black p-6 text-center shadow-[12px_12px_0_#000] rotate-1 my-4`}
                        >
                          {hasAnswered ? (
                            <>
                              <h2 className="text-5xl font-display font-bold uppercase mb-2 mt-2">
                                {isCorrect ? 'Nailed It! 🔥' : 'Oof, Incorrect! 🧊'}
                              </h2>
                              <p className="font-mono font-bold mb-2">
                                {isCorrect
                                  ? `Amazing! You earned +${pointsEarned} Pts.`
                                  : 'Tough luck, better try again next round.'}
                              </p>
                              {rankMessage && (
                                <p className="inline-block bg-black text-white font-bold uppercase tracking-widest text-sm px-3 py-1 mb-2 transform -rotate-1 shadow-[2px_2px_0_rgba(0,0,0,0.5)] border border-white/20">
                                  {rankMessage}
                                </p>
                              )}
                            </>
                          ) : (
                            <h2 className="text-4xl font-display font-bold uppercase mb-2 mt-2">
                              Time's Up! ⏱️
                            </h2>
                          )}
                          <div className="bg-white border-4 border-black p-4 -rotate-1 shadow-[4px_4px_0_#000] my-6">
                            <p className="text-black/80 font-bold text-xs uppercase tracking-widest mb-1">
                              The Correct Answer Was
                            </p>
                            <h3 className="text-4xl font-display font-bold text-black uppercase">
                              {currentQuestion.firstName} {currentQuestion.lastName}
                            </h3>
                            {hasAnswered && !isCorrect && myResult?.answer && (
                              <p className="text-sm mt-2 text-black/50 font-mono">
                                (not {myResult.answer})
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )
                    })()}

                  {game.command === 'answering' && (
                    <div className="space-y-4">
                      <PlayerGuessInput
                        answerMode={game.answerMode}
                        choices={(game.choices as unknown as string[]) ?? []}
                        eliminatedChoices={
                          ((game.playerEliminatedChoices as unknown as Record<string, string[]>) ??
                            {})[myId] ?? []
                        }
                        hasAnswered={hasAnswered}
                        answeredCount={answeredCount}
                        totalPlayers={connectedPlayers.length}
                        onSubmit={handleAnswer}
                      />
                      {game.hintsEnabled && (
                        <HintPanel
                          question={currentQuestion}
                          usedHints={sharedHints}
                          hintsEnabled={game.hintsEnabled}
                          onRequestHint={handleHint}
                        />
                      )}
                      {game.powerupsEnabled && (
                        <div className="pt-2">
                          <p className="text-xs text-game-text-muted uppercase tracking-widest mb-2 text-center">
                            Powerups
                          </p>
                          <PowerupBar
                            charges={myPowerupCharges}
                            answerMode={game.answerMode}
                            revealMode={game.revealMode}
                            command={game.command}
                            onActivate={handlePowerup}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
          </AnimatePresence>

          {/* ── Career mode ── */}
          <AnimatePresence mode="wait">
            {(game.command === 'answering' || game.command === 'revealing') &&
              gameMode === 'career' &&
              careerSeasons.length > 0 && (
                <motion.div
                  key={`career-round-${game.currentQuestionIndex}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4 bg-white p-6 border-8 border-black"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-black/50">
                      Career Q {(game.currentQuestionIndex ?? 0) + 1}/{game.questionCount}
                    </span>
                    <span className="text-xs font-bold text-magenta uppercase tracking-widest">
                      Career Mode
                    </span>
                  </div>

                  <CareerRevealCard
                    seasons={careerSeasons}
                    revealedCount={revealedSeasonCount}
                    buzzedInPlayerName={
                      buzzedInPlayerId && buzzedInPlayerId !== myId
                        ? players.find((p) => p.id === buzzedInPlayerId)?.name
                        : undefined
                    }
                    lockedOutCount={lockedOutPlayers.length}
                  />

                  {/* Career reveal result */}
                  {game.command === 'revealing' &&
                    currentQuestion &&
                    (() => {
                      const history = (game.questionHistory as unknown as QuestionResult[]) ?? []
                      const latestResult = history.length > 0 ? history[history.length - 1] : null
                      const myResult = latestResult?.playerAnswers?.[myId]
                      const isCorrect = myResult?.correct ?? false
                      const pts = myResult?.points ?? 0

                      return (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`border-8 border-black p-6 text-center shadow-[8px_8px_0_#000] ${isCorrect ? 'bg-lime text-black' : 'bg-white text-black'}`}
                        >
                          {isCorrect ? (
                            <>
                              <h2 className="text-4xl font-bold uppercase mb-1">Nailed It! 🔥</h2>
                              <p className="font-mono font-bold">+{pts} pts</p>
                            </>
                          ) : (
                            <h2 className="text-3xl font-bold uppercase mb-1">
                              {lockedOutPlayers.includes(myId)
                                ? 'Wrong guess ❌'
                                : 'Nobody got it 🏒'}
                            </h2>
                          )}
                          <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0_#000] mt-4">
                            <p className="text-black/60 text-xs uppercase tracking-widest mb-1">
                              The Answer Was
                            </p>
                            <h3 className="text-3xl font-bold text-black">
                              {currentQuestion.firstName} {currentQuestion.lastName}
                            </h3>
                          </div>
                        </motion.div>
                      )
                    })()}

                  {game.command === 'answering' && (
                    <BuzzInButton
                      playerId={myId}
                      buzzedInPlayerId={buzzedInPlayerId}
                      lockedOutPlayers={lockedOutPlayers}
                      onBuzzIn={handleBuzzIn}
                      onSubmitAnswer={handleCareerAnswer}
                    />
                  )}
                </motion.div>
              )}
          </AnimatePresence>

          {/* ── H2H mode ── */}
          <AnimatePresence mode="wait">
            {(game.command === 'answering' || game.command === 'revealing') &&
              gameMode === 'h2h' &&
              h2hCurrentPair && (
                <motion.div
                  key={`h2h-round-${game.currentQuestionIndex}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white p-6 border-8 border-black space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-game-text-muted">
                      Q {(game.currentQuestionIndex ?? 0) + 1}/{game.questionCount}
                    </span>
                    <span className="text-xs font-bold text-magenta uppercase tracking-widest">
                      Head-to-Head
                    </span>
                  </div>

                  <H2HComparisonCard
                    pair={h2hCurrentPair}
                    myAnswer={(game.answers as Record<string, string>)?.[myId]}
                    revealed={game.command === 'revealing'}
                    onAnswer={(side) => {
                      if (hasAnswered) return
                      submitAnswer({ playerId: myId, answer: side })
                    }}
                  />

                  {game.command === 'revealing' &&
                    (() => {
                      const history = (game.questionHistory as unknown as QuestionResult[]) ?? []
                      const latestResult = history.length > 0 ? history[history.length - 1] : null
                      const myResult = latestResult?.playerAnswers?.[myId]
                      const isCorrect = myResult?.correct ?? false
                      const pts = myResult?.points ?? 0

                      return (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`border-8 border-black p-5 text-center shadow-[8px_8px_0_#000] ${isCorrect ? 'bg-lime text-black' : 'bg-game-red text-white'}`}
                        >
                          <h2 className="text-3xl font-bold uppercase">
                            {hasAnswered ? (isCorrect ? 'Correct! 🔥' : 'Wrong ❌') : "Time's up!"}
                          </h2>
                          {isCorrect && pts > 0 && (
                            <p className="font-mono font-bold mt-1">+{pts} pts</p>
                          )}
                        </motion.div>
                      )
                    })()}

                  {game.command === 'answering' && (
                    <div className="flex items-center gap-2 text-xs text-game-text-muted justify-center pt-1">
                      <span>
                        {answeredCount}/{connectedPlayers.length} answered
                      </span>
                    </div>
                  )}
                </motion.div>
              )}
          </AnimatePresence>

          {/* ── Higher / Lower mode ── */}
          <AnimatePresence mode="wait">
            {(game.command === 'answering' || game.command === 'revealing') &&
              gameMode === 'higher-lower' &&
              hlCurrentPair && (
                <motion.div
                  key={`hl-round-${game.currentQuestionIndex}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white p-6 border-8 border-black space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-game-text-muted">
                      Q {(game.currentQuestionIndex ?? 0) + 1}/{game.questionCount}
                    </span>
                    <span className="text-xs font-bold text-magenta uppercase tracking-widest">
                      Higher or Lower
                    </span>
                  </div>

                  <HigherLowerCard
                    pair={hlCurrentPair}
                    myAnswer={(game.answers as Record<string, string>)?.[myId]}
                    revealed={game.command === 'revealing'}
                    onAnswer={(answer) => {
                      if (hasAnswered) return
                      submitAnswer({ playerId: myId, answer })
                    }}
                  />

                  {game.command === 'revealing' &&
                    (() => {
                      const history = (game.questionHistory as unknown as QuestionResult[]) ?? []
                      const latestResult = history.length > 0 ? history[history.length - 1] : null
                      const myResult = latestResult?.playerAnswers?.[myId]
                      const isCorrect = myResult?.correct ?? false
                      const pts = myResult?.points ?? 0

                      return (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`border-8 border-black p-5 text-center shadow-[8px_8px_0_#000] ${isCorrect ? 'bg-lime text-black' : 'bg-game-red text-white'}`}
                        >
                          <h2 className="text-3xl font-bold uppercase">
                            {hasAnswered ? (isCorrect ? 'Correct! 🔥' : 'Wrong ❌') : "Time's up!"}
                          </h2>
                          {isCorrect && pts > 0 && (
                            <p className="font-mono font-bold mt-1">+{pts} pts</p>
                          )}
                        </motion.div>
                      )
                    })()}

                  {game.command === 'answering' && (
                    <div className="flex items-center gap-2 text-xs text-game-text-muted justify-center pt-1">
                      <span>
                        {answeredCount}/{connectedPlayers.length} answered
                      </span>
                    </div>
                  )}
                </motion.div>
              )}
          </AnimatePresence>

          {/* Game finished */}
          <AnimatePresence>
            {game.command === 'finished' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 bg-white p-8 border-4 border-black"
              >
                <div className="text-center py-4">
                  <div className="text-6xl mb-3">🏆</div>
                  <h2 className="text-3xl font-bold uppercase tracking-widest text-game-gold">
                    Game Over!
                  </h2>
                </div>

                <Scoreboard players={players} variant="final" myId={myId} />

                <QuestionHistory
                  history={(game.questionHistory as unknown as QuestionResult[]) ?? []}
                  players={players}
                  myId={myId}
                  gameMode={gameMode}
                />

                {!isController && (
                  <p className="text-center text-game-text-muted text-sm pt-2">
                    Waiting for host to restart…
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Standings sidebar (multiplayer only, hidden on finished screen) ── */}
        {connectedPlayers.length >= 2 && game.command !== 'finished' && (
          <aside className="shrink-0 border-t border-game-card-border lg:border-t-0 lg:border-l lg:w-72 overflow-y-auto bg-game-bg/50">
            <div className="p-4 lg:sticky lg:top-0">
              <p className="text-xs font-bold uppercase tracking-widest text-game-text-muted mb-3 flex items-center gap-1.5">
                <span>🏆</span> Standings
              </p>
              <Scoreboard players={players} variant="live" myId={myId} />
            </div>
          </aside>
        )}
      </div>

      {/* ── Controller Dock (host / boss) ── */}
      {isController && (
        <ControllerDock
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

// ─── Question History ─────────────────────────────────────────────────────────

function QuestionHistory({
  history,
  players,
  myId,
  gameMode,
}: {
  history: QuestionResult[]
  players: Player[]
  myId: string
  gameMode: string
}) {
  if (history.length === 0) return null

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-widest text-game-text-muted">
        Round Recap
      </p>
      {history.map((entry, i) => {
        const q = entry.question
        return (
          <div
            key={q.id + i}
            className="bg-game-card-dark border border-game-card-border rounded-xl p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs text-game-text-muted mr-2">Q{i + 1}</span>
                <span className="font-bold text-black">
                  {gameMode === 'higher-lower' ? 'Higher or Lower' : `${q.firstName} ${q.lastName}`}
                </span>
                {(gameMode === 'classic' || gameMode === 'career') && (
                  <span className="text-xs text-game-text-muted ml-2">
                    {q.season} · {q.teamAbbrevs} · {q.points} pts
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-1">
              {players.map((player) => {
                const result = entry.playerAnswers[player.id]
                if (!result) return null
                const isMe = player.id === myId
                return (
                  <div
                    key={player.id}
                    className={`flex items-center gap-3 text-sm rounded-lg px-3 py-1.5 ${isMe ? 'bg-ice-blue/10 border border-ice-blue/20' : ''}`}
                  >
                    <span
                      className={`text-base ${result.correct ? 'text-game-accent-4' : 'text-game-red'}`}
                    >
                      {result.correct ? '✓' : '✗'}
                    </span>
                    <span className="flex-1 font-medium truncate">{player.name}</span>
                    <span className="text-game-text-muted truncate max-w-[120px] text-xs">
                      {result.answer || '—'}
                    </span>
                    <span
                      className={`font-bold tabular-nums ${result.points > 0 ? 'text-game-gold' : result.points < 0 ? 'text-game-red' : 'text-game-text-muted'}`}
                    >
                      {result.points > 0 ? `+${result.points}` : result.points}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Controller Dock ──────────────────────────────────────────────────────────

function ControllerDock({
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
