'use client'

/**
 * Shared "TV screen" view - display-only, no input.
 * Open this on a projector/laptop while players use /player/[id] on their phones.
 * When host is not playing (hostPlays=false), this page also drives the state machine.
 *
 * Cards on Ice: a header strip, the body, and the binder of player cards along
 * the bottom. Classic is played as a mystery trading card with its card back;
 * the other modes keep their own boards (phase 3) beside the side rail.
 */

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Eye, Pause, Play, SkipForward } from 'lucide-react'
import { useStorage } from '@/lib/party/client'
import {
  useAdvanceToNext,
  useNextCareerRound,
  useRefreshCareerData,
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
  useSetGamePaused,
  useTickCountdown,
} from '@/lib/party/mutations'
import { getOrCreateGuest } from '@/lib/guest'
import { useHostStateMachine } from '@/hooks/useHostStateMachine'
import { useQuestionTimeLeft } from '@/hooks/useQuestionTimeLeft'
import { useCareerPenalties } from '@/hooks/useCareerPenalties'
import { questionPausedAt } from '@/lib/game/room-clock'
import { GamePausedBanner } from '@/components/game/GamePausedBanner'
import { SideRail } from '@/components/game/SideRail'
import { AnswerRow, type AnswerState } from '@/components/game/AnswerRow'
import { FinalBoard } from '@/components/game/Scoreboard'
import { CareerAnswerPopover } from '@/components/game/CareerAnswerPopover'
import { CareerRevealCard } from '@/components/game/CareerRevealCard'
import { H2HComparisonCard } from '@/components/game/H2HComparisonCard'
import { HigherLowerCard } from '@/components/game/HigherLowerCard'
import { MonoLabel } from '@/components/design-system'
import { MysteryCard, type CardChip } from '@/components/cards/MysteryCard'
import { CardBack } from '@/components/cards/CardBack'
import { Binder, type RoundResult } from '@/components/cards/Binder'
import { TvHeader, type HeaderControl } from '@/components/cards/TvHeader'
import { ClockStamp } from '@/components/cards/ClockStamp'
import { streakLeader } from '@/lib/streaks'
import { CAREER_REVEAL_INTERVAL_MS } from '@/types/game'
import type {
  DifficultyTier,
  GameState,
  H2HPair,
  HintType,
  HLPair,
  Player,
  Question,
  QuestionResult,
} from '@/types/game'

interface GamePageProps {
  params: Promise<{ roomId: string }>
}

const QUESTION_SECONDS = 30
const ANSWER_LETTERS = ['A', 'B', 'C', 'D']

const MODE_LABELS: Record<string, string> = {
  classic: 'Classic',
  career: 'Career',
  h2h: 'Head-to-Head',
  'higher-lower': 'Higher or Lower',
}

const MODE_TITLES: Record<string, string> = {
  classic: 'Name the player',
  career: 'Who is this?',
  h2h: 'Which line is his?',
  'higher-lower': 'Higher or lower?',
}

const POSITIONS: Record<string, string> = {
  C: 'Centre',
  L: 'Left wing',
  LW: 'Left wing',
  R: 'Right wing',
  RW: 'Right wing',
  D: 'Defence',
  G: 'Goalie',
}

function fullName(q: Question): string {
  return `${q.firstName} ${q.lastName}`.trim()
}

function hintLine(q: Question, used: HintType[], hintsEnabled: boolean): string {
  if (!hintsEnabled) return 'No hints this game. Read the card back.'
  const known: string[] = []
  if (used.includes('position')) known.push(`plays ${(POSITIONS[q.positionCode] ?? q.positionCode).toLowerCase()}`)
  if (used.includes('team')) known.push(`played for ${q.teamNames}`)
  if (used.includes('era')) known.push(`played in ${q.season.replace('-', '–')}`)
  if (known.length === 0) return 'Every hint is still face down.'
  const s = known.join(', ')
  return `${s.charAt(0).toUpperCase()}${s.slice(1)}.`
}

export default function GamePage({ params: paramsPromise }: GamePageProps) {
  const router = useRouter()
  const [roomId, setRoomId] = useState('')
  const [myId, setMyId] = useState('')
  const game = useStorage((root) => root.game)

  const tickCountdown = useTickCountdown()
  const nextQuestion = useNextQuestion()
  const nextCareerRound = useNextCareerRound()
  const refreshCareerData = useRefreshCareerData()
  const revealNextCareerSeason = useRevealNextCareerSeason()
  const revealCareerAnswer = useRevealCareerAnswer()
  const nextH2HRound = useNextH2HRound()
  const nextHLRound = useNextHLRound()
  const revealAnswers = useRevealAnswers()
  const revealH2HAnswers = useRevealH2HAnswers()
  const revealHLAnswers = useRevealHLAnswers()
  const advanceToNext = useAdvanceToNext()
  const skipQuestion = useSkipQuestion()
  const setGamePaused = useSetGamePaused()
  const rematch = useRematch()

  useEffect(() => {
    paramsPromise.then(({ roomId }) => setRoomId(roomId))
    const guest = getOrCreateGuest()
    setMyId(guest.id)
  }, [paramsPromise])

  const isHost = game?.hostId === myId
  const isBoss = game?.bossId === myId
  const isController = isHost || isBoss
  const isPaused = Boolean(game?.pausedAt)
  const penalties = useCareerPenalties(game?.careerPenaltyEndsAt, game?.pausedAt, game?.command === 'answering')
  const lockedOutPlayers = Object.keys(penalties)

  useHostStateMachine(isHost, myId, game as unknown as GameState | null, {
    tickCountdown,
    nextQuestion,
    nextCareerRound,
    refreshCareerData,
    revealNextCareerSeason,
    revealCareerAnswer,
    nextH2HRound,
    nextHLRound,
    revealAnswers,
    revealH2HAnswers,
    revealHLAnswers,
  })

  useEffect(() => {
    // Wait for the room id: before it resolves this would push "//lobby", a protocol-relative URL.
    if (!game || !roomId || game.command !== 'rematch') return
    router.push(`/${roomId}/lobby`)
  }, [game?.command, roomId])

  const questionDurationMs = game?.gameMode === 'career'
    ? (game.careerSeasons?.length ?? 0) * CAREER_REVEAL_INTERVAL_MS
    : QUESTION_SECONDS * 1000
  const timeLeft = useQuestionTimeLeft(
    game?.questionStartsAt, game?.command === 'answering', questionDurationMs,
    game?.gameMode === 'career' ? game.careerPausedDurationMs : 0,
    game ? questionPausedAt(game) : undefined,
  )

  if (!game) return null

  const players = (game.players as unknown as Player[]) ?? []
  const choices = (game.choices as unknown as string[]) ?? []
  const answers = (game.answers as Record<string, string> | undefined) ?? {}
  const answeredIds = Object.keys(answers)
  const answeredCount = answeredIds.length
  const connectedCount = players.filter((p) => p.isConnected).length
  const currentQuestion = game.currentQuestion as unknown as Question | null
  const gameMode = game.gameMode ?? 'classic'
  const isActive = game.command === 'answering' || game.command === 'revealing'
  const isAnswering = game.command === 'answering'
  const isRevealing = game.command === 'revealing'
  const history = (game.questionHistory as unknown as QuestionResult[]) ?? []
  const usedHints = (game.hintsUsed as unknown as HintType[]) ?? []

  const careerSeasons = (game.careerSeasons as unknown as Question[]) ?? []
  const revealedSeasonCount = game.revealedSeasonCount ?? 0
  const buzzedInPlayerId = game.buzzedInPlayerId ?? ''
  const buzzedInPlayer = players.find((p) => p.id === buzzedInPlayerId)

  const h2hCurrentPair = game.h2hCurrentPair as unknown as H2HPair | null
  const hlCurrentPair = game.hlCurrentPair as unknown as HLPair | null

  const tier = (currentQuestion?.difficulty ?? game.difficultyTiers?.[0]) as DifficultyTier | undefined
  const cardNumber = (game.currentQuestionIndex ?? 0) + 1

  const activePowerup = game.activePowerup as unknown as { type: string; playerId: string } | null
  const powerupOwner = activePowerup && players.find((p) => p.id === activePowerup.playerId)

  // This card's scores, once revealed: the newest history entry.
  const lastResult = isRevealing ? history[history.length - 1] : undefined
  const round: Record<string, RoundResult> | undefined = lastResult
    ? Object.fromEntries(
        players.map((p) => {
          const a = lastResult.playerAnswers?.[p.id]
          return [p.id, { points: a?.points ?? 0, correct: Boolean(a?.correct), answered: Boolean(a?.answer) }]
        }),
      )
    : undefined
  const anyGoal = round ? Object.values(round).some((r) => r.correct) : false

  // Host controls sit in the header strip.
  const controls: HeaderControl[] = []
  if (isController) {
    if (game.command === 'answering' || game.command === 'starting') {
      controls.push({
        label: isPaused ? 'Resume' : 'Pause',
        icon: isPaused ? <Play size={16} strokeWidth={2.4} /> : <Pause size={16} strokeWidth={2.4} />,
        primary: isPaused,
        onClick: () => setGamePaused({ requesterId: myId, paused: !isPaused }),
      })
    }
    if (game.command === 'answering' && !isPaused) {
      controls.push({
        label: 'Skip',
        icon: <SkipForward size={16} strokeWidth={2.4} />,
        onClick: () => skipQuestion(myId),
      })
      controls.push({
        label: 'Reveal',
        icon: <Eye size={16} strokeWidth={2.4} />,
        primary: true,
        onClick: () => {
          if (gameMode === 'career') revealCareerAnswer(myId)
          else if (gameMode === 'h2h') revealH2HAnswers(myId)
          else if (gameMode === 'higher-lower') revealHLAnswers(myId)
          else revealAnswers(myId)
        },
      })
    }
    if (isRevealing) {
      controls.push({
        label: gameMode === 'classic' ? 'Next card' : 'Next round',
        icon: <ChevronRight size={16} strokeWidth={2.4} />,
        primary: true,
        onClick: () => advanceToNext(myId),
      })
    }
  }

  // ── Final board ────────────────────────────────────────────────────────────
  if (game.command === 'finished') {
    return (
      <main className="ice-bg relative flex min-h-screen flex-col overflow-hidden">
        <div className="relative z-[2] mx-auto flex w-full max-w-[1280px] flex-1 flex-col">
          <FinalBoard
            players={players}
            history={history}
            myId={myId}
            eyebrow={`${MODE_LABELS[gameMode] ?? gameMode} · ${game.questionCount} cards`}
            tier={tier}
            onRematch={isController ? () => rematch(myId) : undefined}
            onSettings={isController ? () => router.push(`/${roomId}/setup`) : undefined}
          />
        </div>
      </main>
    )
  }

  const classic = gameMode === 'classic'
  const multipleChoice = game.answerMode === 'multiplechoice' && choices.length > 0
  const pickCounts = Object.values(answers).reduce<Record<string, number>>((acc, a) => {
    acc[a] = (acc[a] ?? 0) + 1
    return acc
  }, {})

  const chips: CardChip[] = currentQuestion
    ? [
        { label: 'TEAM', value: isRevealing || usedHints.includes('team') ? currentQuestion.teamAbbrevs : null },
        { label: 'POS', value: isRevealing || usedHints.includes('position') ? currentQuestion.positionCode : null },
      ]
    : []

  const countdown = (
    <AnimatePresence>
      {game.command === 'starting' && (
        <motion.div
          key="countdown"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-1 flex-col items-center justify-center gap-4"
        >
          <MonoLabel size={16}>Puck drop</MonoLabel>
          <span
            className="font-display tabular-nums"
            style={{ fontSize: 240, lineHeight: 0.8, color: 'var(--color-cobalt)' }}
          >
            {game.countdownTime || '·'}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <main className="ice-bg relative flex h-screen min-h-[720px] flex-col overflow-hidden">
      <TvHeader
        roomId={roomId}
        progress={`${classic ? 'Card' : 'Round'} ${cardNumber} / ${game.questionCount}`}
        modeLabel={MODE_LABELS[gameMode] ?? gameMode}
        tier={tier}
        powerup={activePowerup && powerupOwner ? `${powerupOwner.name} · ${activePowerup.type}` : null}
        controls={controls}
      />

      {isPaused && (
        <div className="relative z-[2] px-10 pt-2">
          <GamePausedBanner />
        </div>
      )}

      {/* ── Classic: the mystery card ── */}
      {classic ? (
        <div className="relative z-[2] flex min-h-0 flex-1 gap-11 px-10 pt-4 pb-4">
          {game.command === 'starting' || !currentQuestion || !isActive ? (
            countdown
          ) : (
            <>
              <div className="w-[340px] shrink-0 pt-2">
                <MysteryCard
                  season={isRevealing || usedHints.includes('era') ? currentQuestion.season : null}
                  cardNumber={cardNumber}
                  chips={chips}
                  revealed={
                    isRevealing
                      ? {
                          playerId: currentQuestion.playerId,
                          name: fullName(currentQuestion),
                          detail: [currentQuestion.teamNames, POSITIONS[currentQuestion.positionCode] ?? currentQuestion.positionCode]
                            .filter(Boolean)
                            .join(' · '),
                        }
                      : null
                  }
                  stamp={isRevealing ? (anyGoal ? { text: 'GOAL!', tone: 'mint' } : { text: 'SAVED', tone: 'pink' }) : null}
                />
              </div>

              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="flex min-w-0 flex-1 flex-col gap-[18px]"
              >
                <div className="flex items-center gap-5">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    {isRevealing && <MonoLabel size={14}>The card was</MonoLabel>}
                    <h1 className="font-display m-0" style={{ fontSize: 58, lineHeight: 0.95, textTransform: 'uppercase' }}>
                      {isRevealing ? fullName(currentQuestion) : MODE_TITLES.classic}
                    </h1>
                    {!isRevealing && (
                      <span style={{ fontSize: 17, fontWeight: 500, color: 'var(--color-ink-2)' }}>
                        {hintLine(currentQuestion, usedHints, Boolean(game.hintsEnabled))}
                      </span>
                    )}
                  </div>
                  {isAnswering && <ClockStamp seconds={timeLeft} total={QUESTION_SECONDS} />}
                </div>

                <CardBack
                  question={currentQuestion}
                  revealedColumns={isRevealing ? 5 : (game.revealedColumns ?? 0)}
                />

                {multipleChoice ? (
                  <div className="grid grid-cols-2 gap-3.5">
                    {choices.map((choice, i) => {
                      const isCorrect =
                        isRevealing && choice.trim().toLowerCase() === fullName(currentQuestion).toLowerCase()
                      const picks = pickCounts[choice] ?? 0
                      const state: AnswerState = isRevealing ? (isCorrect ? 'correct' : 'faded') : 'default'
                      return (
                        <AnswerRow
                          key={`${choice}-${i}`}
                          letter={ANSWER_LETTERS[i] ?? '?'}
                          name={choice}
                          variant="card"
                          colorByLetter
                          state={state}
                          meta={isRevealing ? `${picks} ${picks === 1 ? 'pick' : 'picks'}` : undefined}
                        />
                      )
                    })}
                  </div>
                ) : (
                  isAnswering && (
                    <div
                      className="flex items-center gap-3 px-5 py-4"
                      style={{ background: '#fff', border: '2.5px dashed var(--color-edge-dead)', borderRadius: 14 }}
                    >
                      <span className="font-display" style={{ fontSize: 24, textTransform: 'uppercase' }}>
                        Type your answer on your phone
                      </span>
                      <span className="ml-auto" style={{ fontSize: 15, color: 'var(--color-ink-2)' }}>
                        Full name or last name
                      </span>
                    </div>
                  )
                )}
              </motion.div>
            </>
          )}
        </div>
      ) : (
        /* ── Other modes keep their boards until phase 3 ── */
        <div className="relative z-[2] grid min-h-0 flex-1" style={{ gridTemplateColumns: '1fr 300px' }}>
          <div className="flex min-w-0 flex-col px-10 pt-4 pb-4">
            <div className="mb-3.5 flex items-end justify-between gap-5">
              <h1 className="font-display m-0" style={{ fontSize: 58, lineHeight: 0.95, textTransform: 'uppercase' }}>
                {game.command === 'starting' ? 'Puck drop' : (MODE_TITLES[gameMode] ?? MODE_TITLES.classic)}
              </h1>
              {isAnswering && gameMode !== 'career' && <ClockStamp seconds={timeLeft} total={QUESTION_SECONDS} />}
            </div>

            {game.command === 'starting' && countdown}

            {isActive && gameMode === 'career' && careerSeasons.length > 0 && (
              <div className="on-ice min-h-0 overflow-auto p-6">
                <CareerRevealCard
                  size="tv"
                  seasons={careerSeasons}
                  revealedCount={isRevealing ? careerSeasons.length : revealedSeasonCount}
                  showYears={isRevealing || game.careerShowYears !== false}
                  buzzedInPlayerName={buzzedInPlayer?.name}
                  lockedOutCount={lockedOutPlayers.length}
                />
              </div>
            )}

            {isActive && gameMode === 'h2h' && h2hCurrentPair && (
              <div className="min-h-0 overflow-auto">
                <H2HComparisonCard pair={h2hCurrentPair} revealed={isRevealing} />
              </div>
            )}

            {isActive && gameMode === 'higher-lower' && hlCurrentPair && (
              <div className="min-h-0 overflow-auto">
                <HigherLowerCard pair={hlCurrentPair} revealed={isRevealing} />
              </div>
            )}

            <AnimatePresence>
              {isRevealing && (gameMode === 'h2h' || gameMode === 'higher-lower') && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="mt-auto flex items-baseline gap-4 py-5"
                >
                  <MonoLabel size={12}>The answer was</MonoLabel>
                  <span className="font-display" style={{ fontSize: 40, lineHeight: 1, textTransform: 'uppercase' }}>
                    {gameMode === 'higher-lower' && hlCurrentPair
                      ? hlCurrentPair.correctAnswer
                      : gameMode === 'h2h' && h2hCurrentPair
                        ? h2hCurrentPair.targetName
                        : ''}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <SideRail
            answeredCount={answeredCount}
            totalPlayers={Math.max(connectedCount, 1)}
            question={currentQuestion}
            usedHints={usedHints}
            hintsEnabled={Boolean(game.hintsEnabled)}
            showEraHint={gameMode !== 'career' || game.careerShowYears === false}
            streak={streakLeader(history, players)}
          />
        </div>
      )}

      <div className="relative z-[2] px-10 pt-2 pb-6">
        <Binder
          players={players}
          answeredIds={isAnswering ? answeredIds : []}
          round={round}
          label={
            isRevealing
              ? 'THIS CARD'
              : isAnswering
                ? `THE BINDER · ${answeredCount} OF ${Math.max(connectedCount, players.length)} LOCKED IN`
                : 'THE BINDER'
          }
        />
      </div>

      {isRevealing && gameMode === 'career' && currentQuestion && (
        <CareerAnswerPopover
          key={`${gameMode}-answer-${game.currentQuestionIndex}`}
          question={currentQuestion}
          seasons={careerSeasons}
          scope="career"
          result={undefined}
          onNext={isController ? () => advanceToNext(myId) : undefined}
          tv
        />
      )}
    </main>
  )
}
