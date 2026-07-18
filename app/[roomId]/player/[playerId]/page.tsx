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
import { useQuestionTimeLeft } from '@/hooks/useQuestionTimeLeft'
import { useInGameAdsSuppressed } from '@/hooks/useInGameAdsSuppressed'
import { AdsterraBanner } from '@/components/ads/AdsterraBanner'
import { AdsterraPopunder } from '@/components/ads/AdsterraPopunder'
import Dock from '@/components/ui/Dock'
import { CareerRevealCard } from '@/components/game/CareerRevealCard'
import { BuzzInButton } from '@/components/game/BuzzInButton'
import { H2HComparisonCard } from '@/components/game/H2HComparisonCard'
import { HigherLowerCard } from '@/components/game/HigherLowerCard'
import { PlayerGuessInput } from '@/components/game/PlayerGuessInput'
import { Scoreboard } from '@/components/game/Scoreboard'
import { HintPanel } from '@/components/game/HintPanel'
import { Avatar, Button, Modal } from '@/components/design-system'
import { CBrand, StatTile } from '@/components/arcade'
import { getAvatarUrl } from '@/lib/avatar'
import { Eye, SkipForward, ChevronRight, RotateCcw, Settings } from 'lucide-react'
import type {
  AnswerMode,
  H2HPair,
  HintType,
  HLPair,
  Player,
  PowerupType,
  Question,
  QuestionResult,
  RevealMode,
} from '@/types/game'
import { POWERUP_INITIAL_CHARGES } from '@/types/game'

// ─── Fresh Ice palette / helpers ──────────────────────────────────────────────
const INK = '#0a1535'
const RED = '#e32437'
const ROYAL = '#003087'

const STAT_COLUMNS: { key: keyof Question; abbr: string; highlight: boolean }[] = [
  { key: 'gamesPlayed', abbr: 'GP', highlight: false },
  { key: 'goals', abbr: 'G', highlight: false },
  { key: 'assists', abbr: 'A', highlight: false },
  { key: 'points', abbr: 'PTS', highlight: true },
  { key: 'penaltyMinutes', abbr: 'PIM', highlight: false },
]

const ANSWER_LETTERS = ['A', 'B', 'C', 'D']
const ANSWER_LETTER_BG = [RED, ROYAL, '#2cc66b', '#ffcf33']

type PowerupMeta = {
  type: PowerupType
  icon: string
  label: string
  description: string
  availableIn: (answerMode: AnswerMode, revealMode: RevealMode) => boolean
}

const PU_LIST: PowerupMeta[] = [
  {
    type: 'eliminate',
    icon: '✂',
    label: 'Eliminate',
    description: 'Remove 2 wrong choices from the board',
    availableIn: (answerMode) => answerMode === 'multiplechoice',
  },
  {
    type: 'doubledown',
    icon: '×2',
    label: 'Double Down',
    description: '2× points if correct — lose 50 if wrong',
    availableIn: () => true,
  },
  {
    type: 'freeze',
    icon: '❄',
    label: 'Freeze',
    description: 'Stop the reveal timer — lock the columns',
    availableIn: (_am, revealMode) => revealMode === 'timed',
  },
  {
    type: 'extrahint',
    icon: '⚡',
    label: 'Rush',
    description: 'Reveal the next stat column immediately',
    availableIn: (_am, revealMode) => revealMode === 'timed',
  },
]

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const m = Math.floor(s / 60)
  const ss = String(s % 60).padStart(2, '0')
  return `${m}:${ss}`
}

interface PlayerPageProps {
  params: Promise<{ roomId: string; playerId: string }>
}

export default function PlayerPage({ params: paramsPromise }: PlayerPageProps) {
  const router = useRouter()
  const [roomId, setRoomId] = useState('')
  const [playerId, setPlayerId] = useState('')
  const [myId, setMyId] = useState('')
  const [confirmingPowerup, setConfirmingPowerup] = useState<PowerupType | null>(null)

  const game = useStorage((root) => root.game)
  const { suppressed: adsSuppressed } = useInGameAdsSuppressed()

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

  // Per-question answer timer (resets each question via questionStartsAt)
  const questionTimeLeft = useQuestionTimeLeft(game?.questionStartsAt, game?.command === 'answering')

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

  // In the classic active controller we hide the global brand header so the
  // Q-badge / timer row sits at the very top (matches the phone-controller design).
  const classicController =
    gameMode === 'classic' &&
    (game.command === 'answering' || game.command === 'revealing') &&
    !!currentQuestion

  return (
    <main className="ice-bg min-h-screen flex flex-col">
      {/* Header */}
      {!classicController && (
        <header
          className="flex items-center justify-between px-4 py-3"
          style={{ background: '#f4f8ff', borderBottom: `2px solid ${INK}` }}
        >
          <CBrand small />
          {me && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div
                  style={{
                    fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
                    fontSize: 15,
                    color: INK,
                  }}
                  className="tabular-nums"
                >
                  {me.score}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-archivo-black), "Archivo Black", sans-serif',
                    fontSize: 8,
                    letterSpacing: '0.16em',
                    color: '#6b7ea0',
                    textTransform: 'uppercase',
                  }}
                >
                  Rank #{myRank}
                </div>
              </div>
              <Avatar url={getAvatarUrl(me.id)} name={me.name} size={36} />
            </div>
          )}
        </header>
      )}

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div
          className={`flex-1 overflow-y-auto px-4 py-6 space-y-5 max-w-lg mx-auto w-full lg:max-w-none lg:mx-0 ${isController && gameMode === 'career' && game.command === 'answering' ? 'pb-48' : isController ? 'pb-28' : gameMode === 'career' && game.command === 'answering' ? 'pb-32' : ''}`}
        >
          {/* Idle */}
          {game.command === 'idle' && (
            <div className="text-center py-16">
              <p
                style={{
                  fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
                  fontSize: 20,
                  color: INK,
                }}
              >
                Waiting to start…
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-archivo-black), "Archivo Black", sans-serif',
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  color: '#6b7ea0',
                  textTransform: 'uppercase',
                  marginTop: 8,
                }}
              >
                Hold tight
              </p>
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
                <div
                  className="tabular-nums"
                  style={{
                    fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
                    fontSize: '30vw',
                    lineHeight: 1,
                    color: RED,
                    textShadow: '0 6px 0 rgba(227,36,55,0.25)',
                  }}
                >
                  {game.countdownTime || '🏒'}
                </div>
                <p
                  style={{
                    fontFamily: 'var(--font-archivo-black), "Archivo Black", sans-serif',
                    fontSize: 12,
                    letterSpacing: '0.22em',
                    color: INK,
                    textTransform: 'uppercase',
                  }}
                >
                  Get ready!
                </p>
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
                  className="space-y-3"
                >
                  {/* Controller header row: Q badge · name·score · timer */}
                  <div className="flex items-center gap-2.5">
                    <span
                      style={{
                        background: RED,
                        color: '#fff',
                        border: `2px solid ${INK}`,
                        borderRadius: 9999,
                        padding: '4px 12px',
                        fontFamily: 'var(--font-archivo-black), "Archivo Black", sans-serif',
                        fontSize: 11,
                        letterSpacing: '0.12em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Q {(game.currentQuestionIndex ?? 0) + 1}/{game.questionCount}
                    </span>
                    <span
                      className="flex-1 truncate"
                      style={{
                        fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
                        fontSize: 15,
                        color: INK,
                        textAlign: 'center',
                      }}
                    >
                      {me ? `${me.name} · ${me.score}` : ''}
                    </span>
                    <span
                      className="tabular-nums"
                      style={{
                        fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
                        fontSize: 20,
                        color: RED,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatClock(questionTimeLeft)}
                    </span>
                  </div>

                  {/* Progress bar (time remaining) */}
                  <div
                    style={{
                      height: 8,
                      boxSizing: 'border-box',
                      background: '#d3e3ff',
                      border: `2px solid ${INK}`,
                      borderRadius: 9999,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.max(0, Math.min(100, (questionTimeLeft / 30) * 100))}%`,
                        background: RED,
                        borderRadius: 9999,
                        transition: 'width 0.4s linear',
                      }}
                    />
                  </div>

                  {/* Compact stat strip */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {STAT_COLUMNS.map((col, ci) => (
                      <StatTile
                        key={col.key}
                        abbr={col.abbr}
                        size="sm"
                        value={String(currentQuestion[col.key])}
                        highlight={col.highlight}
                        hidden={ci >= (game.revealedColumns ?? 0)}
                      />
                    ))}
                  </div>

                  {game.command === 'revealing' &&
                    (() => {
                      const history = (game.questionHistory as unknown as QuestionResult[]) ?? []
                      const latestResult = history.length > 0 ? history[history.length - 1] : null
                      const myResult = latestResult?.playerAnswers?.[myId]
                      const isCorrect = myResult?.correct ?? false
                      const pointsEarned = myResult?.points ?? 0
                      const resultBg = hasAnswered
                        ? isCorrect
                          ? '#2cc66b'
                          : RED
                        : '#ffcf33'
                      const resultText = hasAnswered && !isCorrect ? '#fff' : INK

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
                          className="p-5 text-center"
                          style={{
                            background: resultBg,
                            color: resultText,
                            border: `2px solid ${INK}`,
                            borderRadius: 14,
                            boxShadow: `0 4px 0 ${INK}`,
                          }}
                        >
                          {hasAnswered ? (
                            <>
                              <h2
                                style={{
                                  fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
                                  fontSize: 30,
                                  lineHeight: 1.05,
                                  marginBottom: 8,
                                }}
                              >
                                {isCorrect ? 'Nailed It! 🔥' : 'Oof! 🧊'}
                              </h2>
                              <p
                                style={{
                                  fontFamily: 'var(--font-jetbrains-mono), monospace',
                                  fontSize: 13,
                                  fontWeight: 700,
                                  marginBottom: 8,
                                }}
                              >
                                {isCorrect
                                  ? `You earned +${pointsEarned} pts`
                                  : 'Tough luck — next round is yours'}
                              </p>
                              {rankMessage && (
                                <p
                                  className="inline-block"
                                  style={{
                                    background: INK,
                                    color: '#fff',
                                    fontFamily:
                                      'var(--font-archivo-black), "Archivo Black", sans-serif',
                                    fontSize: 11,
                                    letterSpacing: '0.14em',
                                    textTransform: 'uppercase',
                                    padding: '4px 10px',
                                    borderRadius: 9999,
                                    marginBottom: 8,
                                  }}
                                >
                                  {rankMessage}
                                </p>
                              )}
                            </>
                          ) : (
                            <h2
                              style={{
                                fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
                                fontSize: 26,
                                marginBottom: 8,
                              }}
                            >
                              Time&apos;s Up! ⏱️
                            </h2>
                          )}
                          <div
                            style={{
                              background: '#fff',
                              border: `2px solid ${INK}`,
                              borderRadius: 12,
                              boxShadow: `0 3px 0 ${INK}`,
                              padding: 16,
                              marginTop: 16,
                            }}
                          >
                            <p
                              style={{
                                fontFamily:
                                  'var(--font-archivo-black), "Archivo Black", sans-serif',
                                fontSize: 9,
                                letterSpacing: '0.18em',
                                textTransform: 'uppercase',
                                color: '#6b7ea0',
                                marginBottom: 6,
                              }}
                            >
                              The Correct Answer Was
                            </p>
                            <h3
                              style={{
                                fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
                                fontSize: 22,
                                color: INK,
                              }}
                            >
                              {currentQuestion.firstName} {currentQuestion.lastName}
                            </h3>
                            {hasAnswered && !isCorrect && myResult?.answer && (
                              <p
                                style={{
                                  fontFamily: 'var(--font-jetbrains-mono), monospace',
                                  fontSize: 12,
                                  color: '#6b7ea0',
                                  marginTop: 8,
                                }}
                              >
                                (not {myResult.answer})
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )
                    })()}

                  {game.command === 'answering' &&
                    (() => {
                      const choices = (game.choices as unknown as string[]) ?? []
                      const myEliminated =
                        ((game.playerEliminatedChoices as unknown as Record<string, string[]>) ??
                          {})[myId] ?? []
                      const mySelected = (game.answers as Record<string, string> | undefined)?.[myId]

                      return (
                        <div className="space-y-3">
                          {game.answerMode === 'multiplechoice' ? (
                            <div className="space-y-3">
                              {choices.map((choice, i) => {
                                const isEliminated = myEliminated.includes(choice)
                                const isSelected = mySelected === choice
                                const disabled = hasAnswered || isEliminated
                                const letterBg = ANSWER_LETTER_BG[i] ?? INK
                                return (
                                  <button
                                    key={choice}
                                    onClick={() => {
                                      if (!disabled) handleAnswer(choice)
                                    }}
                                    disabled={disabled}
                                    className="btn-puffy"
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 12,
                                      width: '100%',
                                      textAlign: 'left',
                                      minHeight: 52,
                                      padding: '10px 14px',
                                      borderRadius: 14,
                                      border: `2px solid ${isEliminated ? '#9aa2bd' : INK}`,
                                      background: isSelected
                                        ? ROYAL
                                        : isEliminated
                                          ? '#d9d9e6'
                                          : '#fff',
                                      boxShadow: isEliminated
                                        ? 'none'
                                        : isSelected
                                          ? `0 5px 0 ${INK}`
                                          : `0 4px 0 ${INK}`,
                                      opacity: isEliminated ? 0.55 : 1,
                                      cursor: disabled ? 'default' : 'pointer',
                                    }}
                                  >
                                    <span
                                      style={{
                                        width: 32,
                                        height: 32,
                                        flexShrink: 0,
                                        borderRadius: 8,
                                        border: `2px solid ${INK}`,
                                        background: isSelected ? '#fff' : letterBg,
                                        color: isSelected ? ROYAL : '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
                                        fontSize: 14,
                                        lineHeight: 1,
                                      }}
                                    >
                                      {ANSWER_LETTERS[i] ?? ''}
                                    </span>
                                    <span
                                      className="flex-1"
                                      style={{
                                        fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
                                        fontSize: 14,
                                        color: isSelected ? '#fff' : isEliminated ? '#6b7ea0' : INK,
                                        textDecoration: isEliminated ? 'line-through' : 'none',
                                      }}
                                    >
                                      {choice}
                                      {isSelected ? ' ✓' : ''}
                                    </span>
                                  </button>
                                )
                              })}
                            </div>
                          ) : (
                            <PlayerGuessInput
                              answerMode={game.answerMode}
                              choices={choices}
                              eliminatedChoices={myEliminated}
                              hasAnswered={hasAnswered}
                              answeredCount={answeredCount}
                              totalPlayers={connectedPlayers.length}
                              onSubmit={handleAnswer}
                            />
                          )}

                          {hasAnswered && (
                            <p
                              className="text-center"
                              style={{
                                fontFamily:
                                  'var(--font-archivo-black), "Archivo Black", sans-serif',
                                fontSize: 10,
                                letterSpacing: '0.16em',
                                textTransform: 'uppercase',
                                color: '#6b7ea0',
                              }}
                            >
                              Answer locked · {answeredCount}/{connectedPlayers.length} in
                            </p>
                          )}

                          {game.hintsEnabled && (
                            <HintPanel
                              question={currentQuestion}
                              usedHints={sharedHints}
                              hintsEnabled={game.hintsEnabled}
                              onRequestHint={handleHint}
                            />
                          )}

                          {game.powerupsEnabled && (
                            <div className="pt-1 flex gap-2.5 justify-center">
                              {PU_LIST.map((pu) => {
                                const charge = myPowerupCharges[pu.type] ?? 0
                                const available = pu.availableIn(
                                  game.answerMode,
                                  game.revealMode
                                )
                                const canUse =
                                  available && charge > 0 && game.command === 'answering'
                                return (
                                  <button
                                    key={pu.type}
                                    disabled={!canUse}
                                    onClick={() => canUse && setConfirmingPowerup(pu.type)}
                                    title={pu.label}
                                    className={canUse ? 'btn-puffy' : undefined}
                                    style={{
                                      position: 'relative',
                                      width: 44,
                                      height: 44,
                                      borderRadius: 12,
                                      border: `2px solid ${canUse ? INK : '#9aa2bd'}`,
                                      background: !canUse
                                        ? '#e6e8f2'
                                        : pu.type === 'doubledown'
                                          ? '#ffcf33'
                                          : '#fff',
                                      boxShadow: canUse ? `0 3px 0 ${INK}` : 'none',
                                      color: INK,
                                      opacity: canUse ? 1 : 0.45,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
                                      fontSize: pu.type === 'doubledown' ? 15 : 18,
                                      cursor: canUse ? 'pointer' : 'not-allowed',
                                    }}
                                  >
                                    {pu.icon}
                                    {charge > 0 && (
                                      <span
                                        style={{
                                          position: 'absolute',
                                          top: -6,
                                          right: -6,
                                          minWidth: 16,
                                          height: 16,
                                          padding: '0 3px',
                                          borderRadius: 9999,
                                          background: INK,
                                          color: '#fff',
                                          border: '1.5px solid #fff',
                                          fontFamily:
                                            'var(--font-jetbrains-mono), monospace',
                                          fontSize: 9,
                                          fontWeight: 700,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          lineHeight: 1,
                                        }}
                                      >
                                        {charge}
                                      </span>
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })()}
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
                  className="space-y-4 bg-white p-6 card-puffy"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-game-text-muted">
                      Career Q {(game.currentQuestionIndex ?? 0) + 1}/{game.questionCount}
                    </span>
                    <span className="text-xs font-bold text-game-red uppercase tracking-widest">
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
                          className={`card-puffy p-6 text-center ${isCorrect ? 'bg-lime text-game-text' : 'bg-white text-game-text'}`}
                        >
                          {isCorrect ? (
                            <>
                              <h2 className="font-display text-3xl uppercase mb-1">Nailed It! 🔥</h2>
                              <p className="font-mono font-bold">+{pts} pts</p>
                            </>
                          ) : (
                            <h2 className="font-display text-2xl uppercase mb-1">
                              {lockedOutPlayers.includes(myId)
                                ? 'Wrong guess ❌'
                                : 'Nobody got it 🏒'}
                            </h2>
                          )}
                          <div className="bg-white card-puffy-sm p-4 mt-4">
                            <p className="text-game-text-muted text-xs uppercase tracking-widest mb-1">
                              The Answer Was
                            </p>
                            <h3 className="font-display text-2xl text-game-text">
                              {currentQuestion.firstName} {currentQuestion.lastName}
                            </h3>
                          </div>
                        </motion.div>
                      )
                    })()}

                  {game.command === 'answering' && (!isController || gameMode === 'career') && (
                    <BuzzInButton
                      playerId={myId}
                      buzzedInPlayerId={buzzedInPlayerId}
                      lockedOutPlayers={lockedOutPlayers}
                      onBuzzIn={handleBuzzIn}
                      onSubmitAnswer={handleCareerAnswer}
                      offsetForDock={isController}
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
                  className="bg-white p-6 card-puffy space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-game-text-muted">
                      Q {(game.currentQuestionIndex ?? 0) + 1}/{game.questionCount}
                    </span>
                    <span className="text-xs font-bold text-game-red uppercase tracking-widest">
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
                          className={`card-puffy p-5 text-center ${isCorrect ? 'bg-lime text-game-text' : 'bg-game-red text-white'}`}
                        >
                          <h2 className="font-display text-2xl uppercase">
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
                  className="bg-white p-6 card-puffy space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-game-text-muted">
                      Q {(game.currentQuestionIndex ?? 0) + 1}/{game.questionCount}
                    </span>
                    <span className="text-xs font-bold text-game-red uppercase tracking-widest">
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
                          className={`card-puffy p-5 text-center ${isCorrect ? 'bg-lime text-game-text' : 'bg-game-red text-white'}`}
                        >
                          <h2 className="font-display text-2xl uppercase">
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
                className="space-y-6 bg-white p-8 card-puffy"
              >
                <div className="text-center py-4">
                  <div className="text-6xl mb-3">🏆</div>
                  <h2 className="font-display text-3xl uppercase text-game-text">Game Over!</h2>
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

                {/* Monetization: end-screen banner + popunder (player device only). */}
                <AdsterraBanner slot="player-finished" suppressed={adsSuppressed} />
                <AdsterraPopunder suppressed={adsSuppressed} />
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

      {/* ── Powerup confirmation ── */}
      <AnimatePresence>
        {confirmingPowerup &&
          (() => {
            const pu = PU_LIST.find((p) => p.type === confirmingPowerup)
            if (!pu) return null
            return (
              <Modal open onClose={() => setConfirmingPowerup(null)}>
                <div className="text-center space-y-4">
                  <div
                    style={{
                      fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
                      fontSize: 40,
                      color: INK,
                    }}
                  >
                    {pu.icon}
                  </div>
                  <h3
                    style={{
                      fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
                      fontSize: 20,
                      color: INK,
                    }}
                  >
                    {pu.label}
                  </h3>
                  <p className="text-game-text-muted text-sm">{pu.description}</p>
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="ghost"
                      className="flex-1"
                      onClick={() => setConfirmingPowerup(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      className="flex-1"
                      onClick={() => {
                        handlePowerup(pu.type)
                        setConfirmingPowerup(null)
                      }}
                    >
                      Use It
                    </Button>
                  </div>
                </div>
              </Modal>
            )
          })()}
      </AnimatePresence>
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
          <div key={q.id + i} className="bg-white card-flat p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs text-game-text-muted mr-2">Q{i + 1}</span>
                <span className="font-bold text-game-text">
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
                    className={`flex items-center gap-3 text-sm rounded-lg px-3 py-1.5 ${isMe ? 'bg-ice-blue border border-game-card-border' : ''}`}
                  >
                    <span
                      className={`text-base ${result.correct ? 'text-tier-easy' : 'text-game-red'}`}
                    >
                      {result.correct ? '✓' : '✗'}
                    </span>
                    <span className="flex-1 font-medium truncate">{player.name}</span>
                    <span className="text-game-text-muted truncate max-w-[120px] text-xs">
                      {result.answer || '—'}
                    </span>
                    <span
                      className={`font-bold tabular-nums ${result.points > 0 ? 'text-tier-easy' : result.points < 0 ? 'text-game-red' : 'text-game-text-muted'}`}
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
      className: 'bg-game-red border-2 border-game-card-border text-white',
    })
    items.push({
      icon: <SkipForward size={24} />,
      label: 'Skip',
      onClick: onSkip,
      className: 'bg-yellow border-2 border-game-card-border text-white',
    })
  }

  if (command === 'revealing') {
    items.push({
      icon: <ChevronRight size={24} />,
      label: nextLabel,
      onClick: onNext,
      className: 'bg-cyan border-2 border-game-card-border text-black',
    })
  }

  if (command === 'finished') {
    items.push({
      icon: <RotateCcw size={24} />,
      label: 'Play Again',
      onClick: onRematch,
      className: 'bg-magenta border-2 border-game-card-border text-white',
    })
    items.push({
      icon: <Settings size={24} />,
      label: 'Settings',
      onClick: onSettings,
      className: 'bg-white border-2 border-game-card-border text-black',
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
