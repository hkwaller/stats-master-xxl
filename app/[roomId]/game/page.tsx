'use client'

/**
 * Shared "TV screen" view - display-only, no input.
 * Open this on a projector/laptop while players use /player/[id] on their phones.
 * When host is not playing (hostPlays=false), this page also drives the state machine.
 *
 * Layout follows the "On the Ice" broadcast system: a scorebug strip over a
 * 1fr/300px body, closed by a live ticker. Rink geometry and skate scuffs sit
 * behind everything at z-index 0; all chrome sits at z-index 2.
 */

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Eye, SkipForward } from 'lucide-react'
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
import { useQuestionTimeLeft } from '@/hooks/useQuestionTimeLeft'
import { StatsCard } from '@/components/game/StatsCard'
import { Scorebug } from '@/components/game/Scorebug'
import { SideRail, type RailControl } from '@/components/game/SideRail'
import { AnswerRow, type AnswerState } from '@/components/game/AnswerRow'
import { FinalBoard } from '@/components/game/Scoreboard'
import { CareerRevealCard } from '@/components/game/CareerRevealCard'
import { H2HComparisonCard } from '@/components/game/H2HComparisonCard'
import { HigherLowerCard } from '@/components/game/HigherLowerCard'
import { Clock, MonoLabel, ProgressTrack, Ticker } from '@/components/design-system'
import { RinkBg } from '@/components/arcade'
import { streakLeader } from '@/lib/streaks'
import type {
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
  classic: 'Name the skater',
  career: 'Name the career',
  h2h: 'Which line is his?',
  'higher-lower': 'Higher or lower?',
}

function fullName(q: Question): string {
  return `${q.firstName} ${q.lastName}`.trim()
}

/** Live ticker copy, assembled from state that already exists. */
function buildTicker(
  history: QuestionResult[],
  players: Player[],
  poolLabel: string,
): string[] {
  const items: string[] = []
  const last = history[history.length - 1]

  if (last) {
    for (const p of players) {
      const a = last.playerAnswers?.[p.id]
      if (a?.correct && a.points > 0) {
        items.push(`${p.name.toUpperCase()} +${a.points} — CORRECT`)
      }
    }
  }

  const leader = streakLeader(history, players)
  if (leader && leader.streak > 1) {
    items.push(`${leader.player.name.toUpperCase()} STREAK ×${leader.streak}`)
  }

  const top = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]
  if (top && (top.score ?? 0) > 0) {
    items.push(`LEADER ${top.name.toUpperCase()} · ${top.score} PTS`)
  }

  items.push(poolLabel)
  items.push('SEASON DATA 1917–2025')
  return items
}

export default function GamePage({ params: paramsPromise }: GamePageProps) {
  const router = useRouter()
  const [roomId, setRoomId] = useState('')
  const [myId, setMyId] = useState('')
  const game = useStorage((root) => root.game)

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

  const timeLeft = useQuestionTimeLeft(game?.questionStartsAt, game?.command === 'answering')

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
  const isRevealing = game.command === 'revealing'
  const history = (game.questionHistory as unknown as QuestionResult[]) ?? []

  const careerSeasons = (game.careerSeasons as unknown as Question[]) ?? []
  const revealedSeasonCount = game.revealedSeasonCount ?? 0
  const buzzedInPlayerId = game.buzzedInPlayerId ?? ''
  const lockedOutPlayers = (game.lockedOutPlayers as unknown as string[]) ?? []
  const buzzedInPlayer = players.find((p) => p.id === buzzedInPlayerId)

  const h2hCurrentPair = game.h2hCurrentPair as unknown as H2HPair | null
  const hlCurrentPair = game.hlCurrentPair as unknown as HLPair | null

  const difficulty = currentQuestion?.difficulty ?? (game.difficultyTiers?.[0] as string | undefined)
  const scorebugMeta = [MODE_LABELS[gameMode] ?? gameMode, difficulty]
    .filter(Boolean)
    .join(' · ')
    .toUpperCase()

  const activePowerup = game.activePowerup as unknown as
    | { type: string; playerId: string }
    | null
  const powerupOwner = activePowerup && players.find((p) => p.id === activePowerup.playerId)

  // Host controls live at the foot of the rail, not in a floating dock.
  const controls: RailControl[] = []
  if (isController) {
    if (game.command === 'answering') {
      controls.push({
        label: 'Reveal',
        icon: <Eye size={14} strokeWidth={2.2} />,
        tone: 'red',
        onClick: () => {
          if (gameMode === 'career') revealCareerAnswer(myId)
          else if (gameMode === 'h2h') revealH2HAnswers(myId)
          else if (gameMode === 'higher-lower') revealHLAnswers(myId)
          else revealAnswers(myId)
        },
      })
      controls.push({
        label: 'Skip',
        icon: <SkipForward size={14} strokeWidth={2.2} />,
        tone: 'navy',
        onClick: () => skipQuestion(myId),
      })
    }
    if (isRevealing) {
      controls.push({
        label: gameMode === 'classic' ? 'Next question' : 'Next round',
        icon: <ChevronRight size={14} strokeWidth={2.2} />,
        tone: 'red',
        onClick: () => advanceToNext(myId),
      })
    }
  }

  // ── Final board ────────────────────────────────────────────────────────────
  if (game.command === 'finished') {
    return (
      <main className="ice-bg relative flex min-h-screen flex-col overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full"
          style={{
            bottom: -300,
            width: 640,
            height: 640,
            border: '6px solid rgba(11,83,201,0.10)',
          }}
        />
        <div className="relative z-[2] mx-auto flex w-full max-w-[860px] flex-1 flex-col">
          <FinalBoard
            players={players}
            history={history}
            myId={myId}
            eyebrow={`Final · ${game.questionCount} questions · ${MODE_LABELS[gameMode] ?? gameMode}`}
            onRematch={isController ? () => rematch(myId) : undefined}
            onSettings={isController ? () => router.push(`/${roomId}/setup`) : undefined}
          />
        </div>
      </main>
    )
  }

  return (
    <main className="ice-bg relative flex h-screen min-h-[700px] flex-col overflow-hidden">
      <RinkBg />

      <Scorebug
        players={players}
        answeredIds={game.command === 'answering' ? answeredIds : []}
        roomId={roomId}
        meta={scorebugMeta}
        powerup={
          activePowerup && powerupOwner
            ? { label: `${powerupOwner.name} · ${activePowerup.type}` }
            : null
        }
      />

      <div
        className="relative z-[2] grid min-h-0 flex-1"
        style={{ gridTemplateColumns: '1fr 300px' }}
      >
        {/* ── Main column ── */}
        <div className="flex min-w-0 flex-col px-[26px] pt-[26px] pb-[26px]">
          {/* Title row */}
          <div className="mb-3.5 flex items-end justify-between gap-5">
            <div className="flex flex-col gap-1.5">
              <MonoLabel size={10} tracking="0.28em">
                Question {String((game.currentQuestionIndex ?? 0) + 1).padStart(2, '0')} /{' '}
                {String(game.questionCount).padStart(2, '0')}
              </MonoLabel>
              <h1
                className="font-display m-0"
                style={{
                  fontWeight: 800,
                  fontSize: 60,
                  lineHeight: 0.9,
                  letterSpacing: '0.005em',
                  textTransform: 'uppercase',
                }}
              >
                {game.command === 'starting'
                  ? 'Puck drop'
                  : (MODE_TITLES[gameMode] ?? MODE_TITLES.classic)}
              </h1>
            </div>
            {game.command === 'answering' && <Clock seconds={timeLeft} size={70} />}
          </div>

          <ProgressTrack
            fraction={game.command === 'answering' ? timeLeft / QUESTION_SECONDS : 0}
            urgent={game.command === 'answering' && timeLeft < 5}
            className="mb-[22px]"
          />

          {/* Puck-drop countdown */}
          <AnimatePresence>
            {game.command === 'starting' && (
              <motion.div
                key="countdown"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-1 items-center justify-center"
              >
                <span
                  className="font-display tabular-nums"
                  style={{
                    fontWeight: 800,
                    fontSize: 240,
                    lineHeight: 0.8,
                    color: '#cf0a2c',
                  }}
                >
                  {game.countdownTime || '·'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Classic ── */}
          {isActive && gameMode === 'classic' && currentQuestion && (
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex min-h-0 flex-col"
            >
              <div className="mb-6">
                <StatsCard
                  question={currentQuestion}
                  revealedColumns={isRevealing ? 5 : (game.revealedColumns ?? 0)}
                  caption={`${currentQuestion.season} SEASON`}
                />
              </div>

              {game.answerMode === 'multiplechoice' && choices.length > 0 ? (
                <div className="grid grid-cols-2 gap-2.5">
                  {choices.map((choice, i) => {
                    const isCorrect =
                      isRevealing &&
                      choice.trim().toLowerCase() === fullName(currentQuestion).toLowerCase()
                    // Wrong picks take the penalty-box treatment on reveal.
                    const wasPicked = Object.values(answers).includes(choice)
                    let state: AnswerState = 'default'
                    if (isRevealing) {
                      if (isCorrect) state = 'correct'
                      else if (wasPicked) state = 'eliminated'
                      else state = 'faded'
                    }
                    return (
                      <AnswerRow
                        key={`${choice}-${i}`}
                        letter={ANSWER_LETTERS[i] ?? '?'}
                        name={choice}
                        meta={state === 'eliminated' ? 'PENALTY BOX' : undefined}
                        state={state}
                      />
                    )
                  })}
                </div>
              ) : (
                isRevealing && (
                  <AnswerRow
                    letter="✓"
                    name={fullName(currentQuestion)}
                    meta={`${currentQuestion.teamAbbrevs} · ${currentQuestion.positionCode}`}
                    state="correct"
                  />
                )
              )}
            </motion.div>
          )}

          {/* ── Career ── */}
          {isActive && gameMode === 'career' && careerSeasons.length > 0 && (
            <div className="on-ice min-h-0 overflow-auto p-6">
              <CareerRevealCard
                seasons={careerSeasons}
                revealedCount={revealedSeasonCount}
                buzzedInPlayerName={buzzedInPlayer?.name}
                lockedOutCount={lockedOutPlayers.length}
              />
            </div>
          )}

          {/* ── Head-to-Head ── */}
          {isActive && gameMode === 'h2h' && h2hCurrentPair && (
            <div className="min-h-0 overflow-auto">
              <H2HComparisonCard pair={h2hCurrentPair} revealed={isRevealing} />
            </div>
          )}

          {/* ── Higher / Lower ── */}
          {isActive && gameMode === 'higher-lower' && hlCurrentPair && (
            <div className="min-h-0 overflow-auto">
              <HigherLowerCard pair={hlCurrentPair} revealed={isRevealing} />
            </div>
          )}

          {/* Reveal band — the answer, stated plainly under the board. */}
          <AnimatePresence>
            {isRevealing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="mt-auto flex items-baseline gap-4 py-5"
              >
                <MonoLabel size={9}>The answer was</MonoLabel>
                <span
                  className="font-display"
                  style={{ fontWeight: 800, fontSize: 40, lineHeight: 1, textTransform: 'uppercase' }}
                >
                  {gameMode === 'higher-lower' && hlCurrentPair
                    ? hlCurrentPair.correctAnswer
                    : gameMode === 'h2h' && h2hCurrentPair
                      ? h2hCurrentPair.targetName
                      : currentQuestion
                        ? fullName(currentQuestion)
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
          usedHints={(game.hintsUsed as unknown as HintType[]) ?? []}
          hintsEnabled={Boolean(game.hintsEnabled)}
          streak={streakLeader(history, players)}
          controls={controls}
        />
      </div>

      <div className="relative z-[2]">
        <Ticker items={buildTicker(history, players, `${MODE_LABELS[gameMode] ?? gameMode} · Room ${roomId}`)} />
      </div>
    </main>
  )
}
