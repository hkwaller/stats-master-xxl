'use client'

import { RinkBg } from '@/components/arcade/RinkBg'

// Future monetization boundary: only after the entire session has completed and final results are visible.
// Consult playam-monetization.monetizationBreakReached; no ad SDK or event is invoked here.

/**
 * The player's phone: a compact scorebug, the jumbotron stat line, an answer
 * stack, and the power-play bar pinned to the bottom edge.
 */

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Eye, Pause, Play, RotateCcw, Settings, SkipForward } from 'lucide-react'
import { useStorage } from '@/lib/liveblocks/client'
import {
  useAdvanceToNext,
  useBuzzIn,
  useCancelCareerBuzz,
  useNextCareerRound,
  useRefreshCareerData,
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
  useSetGamePaused,
  useSubmitAnswer,
  useSubmitCareerAnswer,
  useTickCountdown,
} from '@/lib/liveblocks/mutations'
import { getOrCreateGuest } from '@/lib/guest'
import { useHostStateMachine } from '@/hooks/useHostStateMachine'
import { useQuestionTimeLeft } from '@/hooks/useQuestionTimeLeft'
import { useCareerPenalties } from '@/hooks/useCareerPenalties'
import { questionPausedAt } from '@/lib/game/room-clock'
import { GamePausedBanner } from '@/components/game/GamePausedBanner'
import { RevealResult } from '@/components/game/RevealResult'
import { CareerAnswerPopover } from '@/components/game/CareerAnswerPopover'
import { CareerRevealCard } from '@/components/game/CareerRevealCard'
import { BuzzInButton, BUZZER_HEIGHT } from '@/components/game/BuzzInButton'
import { H2HComparisonCard } from '@/components/game/H2HComparisonCard'
import { HigherLowerCard } from '@/components/game/HigherLowerCard'
import { PlayerGuessInput } from '@/components/game/PlayerGuessInput'
import { PlayerScorebug } from '@/components/game/Scorebug'
import { PowerupBar } from '@/components/game/PowerupBar'
import { Scoreboard, FinalBoard } from '@/components/game/Scoreboard'
import { StatsCard } from '@/components/game/StatsCard'
import { HintPanel } from '@/components/game/HintPanel'
import { Clock, Kickplate, MonoLabel, ProgressTrack } from '@/components/design-system'
import { CBrand } from '@/components/arcade'
import { currentStreak } from '@/lib/streaks'
import type {
  H2HPair,
  HintType,
  HLPair,
  Player,
  PowerupType,
  Question,
  QuestionResult,
} from '@/types/game'
import { CAREER_REVEAL_INTERVAL_MS, POWERUP_INITIAL_CHARGES } from '@/types/game'

const INK = '#0d1b2a'
const RED = '#cf0a2c'
const QUESTION_SECONDS = 30

const MODE_TITLES: Record<string, string> = {
  classic: 'Name the skater',
  career: 'Who is this?',
  h2h: 'Which line is his?',
  'higher-lower': 'Higher or lower?',
}

interface PlayerPageProps {
  params: Promise<{ roomId: string; playerId: string }>
}

export default function PlayerPage({ params: paramsPromise }: PlayerPageProps) {
  const router = useRouter()
  const [roomId, setRoomId] = useState('')
  const [, setPlayerId] = useState('')
  const [myId, setMyId] = useState('')

  const game = useStorage((root) => root.game)

  // ── Mutations ──────────────────────────────────────────────────────────────
  const submitAnswer = useSubmitAnswer()
  const requestHint = useRequestHint()
  const activatePowerup = useActivatePowerup()
  const advanceToNext = useAdvanceToNext()
  const skipQuestion = useSkipQuestion()
  const setGamePaused = useSetGamePaused()
  const revealAnswers = useRevealAnswers()
  const rematch = useRematch()
  const tickCountdown = useTickCountdown()
  const nextQuestion = useNextQuestion()
  const nextCareerRound = useNextCareerRound()
  const refreshCareerData = useRefreshCareerData()
  const revealNextCareerSeason = useRevealNextCareerSeason()
  const buzzIn = useBuzzIn()
  const cancelCareerBuzz = useCancelCareerBuzz()
  const submitCareerAnswer = useSubmitCareerAnswer()
  const revealCareerAnswer = useRevealCareerAnswer()
  const nextH2HRound = useNextH2HRound()
  const revealH2HAnswers = useRevealH2HAnswers()
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

  // ── Derived state ──────────────────────────────────────────────────────────
  const isHost = game?.hostId === myId
  const isBoss = game?.bossId === myId
  const isController = isHost || isBoss
  const isPaused = Boolean(game?.pausedAt)
  const penalties = useCareerPenalties(game?.careerPenaltyEndsAt, game?.pausedAt, game?.command === 'answering')
  const lockedOutPlayers = Object.keys(penalties)
  const gameMode = game?.gameMode ?? 'classic'
  const answeredCount = Object.keys(game?.answers ?? {}).length

  const players = (game?.players as unknown as Player[]) ?? []
  const me = players.find((p) => p.id === myId)
  const myRank = [...players].sort((a, b) => b.score - a.score).findIndex((p) => p.id === myId) + 1

  const mySelected = (game?.answers as Record<string, string> | undefined)?.[myId]
  const hasAnswered = myId ? Boolean(mySelected) : false
  const connectedPlayers = players.filter((p) => p.isConnected)

  const currentQuestion = game?.currentQuestion as unknown as Question | null
  const careerSeasons = (game?.careerSeasons as unknown as Question[]) ?? []
  const revealedSeasonCount = game?.revealedSeasonCount ?? 0
  const buzzedInPlayerId = game?.buzzedInPlayerId ?? ''
  const h2hCurrentPair = game?.h2hCurrentPair as unknown as H2HPair | null
  const hlCurrentPair = game?.hlCurrentPair as unknown as HLPair | null
  const history = (game?.questionHistory as unknown as QuestionResult[]) ?? []

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

  useHostStateMachine(isHost, myId, game as unknown as import('@/types/game').GameState | null, {
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

  const questionDurationMs = gameMode === 'career'
    ? careerSeasons.length * CAREER_REVEAL_INTERVAL_MS
    : QUESTION_SECONDS * 1000
  const questionTimeLeft = useQuestionTimeLeft(
    game?.questionStartsAt,
    game?.command === 'answering',
    questionDurationMs,
    gameMode === 'career' ? game?.careerPausedDurationMs : 0,
    game ? questionPausedAt(game) : undefined,
  )

  useEffect(() => {
    if (!roomId || !isHost || game?.command !== 'rematch') return
    router.push(`/${roomId}/lobby`)
  }, [game?.command, isHost, roomId, router])

  // Remember what has been played today so the pool does not repeat itself.
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

  // ── Handlers ───────────────────────────────────────────────────────────────
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

  const isAnswering = game.command === 'answering'
  const isRevealing = game.command === 'revealing'
  const isActive = isAnswering || isRevealing
  const myEliminated =
    ((game.playerEliminatedChoices as unknown as Record<string, string[]>) ?? {})[myId] ?? []
  const choices = (game.choices as unknown as string[]) ?? []
  const myStreak = currentStreak(history, myId)
  const activePowerup = game.activePowerup as unknown as {
    type: PowerupType
    playerId: string
  } | null

  // The power-play bar owns the bottom edge. It is only useful while answering,
  // so it leaves with the question rather than sitting inert through the reveal.
  const showPowerupBar = Boolean(game.powerupsEnabled) && isAnswering && gameMode === 'classic'

  const controls = buildControls()
  const showCareerBuzzer = isAnswering && gameMode === 'career' && careerSeasons.length > 0
    && !buzzedInPlayerId && !lockedOutPlayers.includes(myId)

  function buildControls() {
    if (!isController)
      return [] as {
        label: string
        icon: React.ReactNode
        tone: 'red' | 'navy'
        onClick: () => void
      }[]
    const out: {
      label: string
      icon: React.ReactNode
      tone: 'red' | 'navy'
      onClick: () => void
    }[] = []
    if (game!.command === 'answering' || game!.command === 'starting') {
      out.push({
        label: isPaused ? 'Resume' : 'Pause',
        icon: isPaused ? <Play size={14} strokeWidth={2.2} /> : <Pause size={14} strokeWidth={2.2} />,
        tone: isPaused ? 'red' : 'navy',
        onClick: () => setGamePaused({ requesterId: myId, paused: !isPaused }),
      })
    }
    if (game!.command === 'answering' && !isPaused) {
      out.push({
        label: 'Reveal',
        icon: <Eye size={14} strokeWidth={2.2} />,
        tone: 'navy',
        onClick: () => {
          if (gameMode === 'career') revealCareerAnswer(myId)
          else if (gameMode === 'h2h') revealH2HAnswers(myId)
          else if (gameMode === 'higher-lower') revealHLAnswers(myId)
          else revealAnswers(myId)
        },
      })
      out.push({
        label: 'Skip',
        icon: <SkipForward size={14} strokeWidth={2.2} />,
        tone: 'navy',
        onClick: () => skipQuestion(myId),
      })
    }
    if (game!.command === 'revealing') {
      out.push({
        label: gameMode === 'classic' ? 'Next question' : 'Next round',
        icon: <ChevronRight size={14} strokeWidth={2.2} />,
        tone: 'red',
        onClick: () => advanceToNext(myId),
      })
    }
    return out
  }

  // ── Final board ────────────────────────────────────────────────────────────
  if (game.command === 'finished') {
    return (
      <main className="ice-bg relative flex min-h-screen flex-col overflow-x-hidden">
      <RinkBg intensity={0.65} />
        <div className="relative z-[2] mx-auto flex w-full max-w-[860px] flex-1 flex-col pb-10">
          <FinalBoard
            players={players}
            history={history}
            myId={myId}
            eyebrow={`Final · ${game.questionCount} questions`}
            onRematch={isController ? () => rematch(myId) : undefined}
            onSettings={isController ? () => router.push(`/${roomId}/setup`) : undefined}
          >
            <div className="mx-10 mt-10 flex flex-col gap-5">
              <QuestionHistory
                history={history}
                players={players}
                myId={myId}
                gameMode={gameMode}
              />
              {!isController && <MonoLabel size={9}>Waiting for the host to restart</MonoLabel>}
            </div>
          </FinalBoard>
        </div>
      </main>
    )
  }

  return (
    <main className="ice-bg relative flex min-h-screen flex-col overflow-x-hidden">
      <RinkBg intensity={0.65} />
      {isActive && me ? (
        <PlayerScorebug
          questionLabel={`Q ${String((game.currentQuestionIndex ?? 0) + 1).padStart(2, '0')} / ${String(game.questionCount).padStart(2, '0')}`}
          name={me.name}
          score={me.score}
          rank={myRank}
        />
      ) : (
        <header className="on-ice-header relative z-20">
          <div className="flex h-[52px] items-center justify-between px-[18px]">
            <CBrand small />
            {me && (
              <div className="flex items-center gap-2.5">
                <span
                  className="font-display tabular-nums"
                  style={{ fontWeight: 800, fontSize: 21, color: INK }}
                >
                  {me.score}
                </span>
                <MonoLabel size={9} tracking="0.16em">
                  #{myRank}
                </MonoLabel>
              </div>
            )}
          </div>
          <Kickplate height={4} />
        </header>
      )}

      {isPaused && <GamePausedBanner />}

      {/* Above the scuff overlay, which paints in the z-index-0 layer. */}
      {gameMode !== 'career' && <ProgressTrack
        className="relative z-[2]"
        fraction={isAnswering ? questionTimeLeft / (questionDurationMs / 1000) : 0}
        urgent={isAnswering && questionTimeLeft < 5}
      />}

      <fieldset
        disabled={isPaused}
        className="relative z-[2] mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-4 px-[18px] pt-[18px]"
        style={{
          border: 0,
          minWidth: 0,
          paddingBottom: `calc(${(showPowerupBar ? 112 : 0) + (showCareerBuzzer ? BUZZER_HEIGHT : 0) + (controls.length ? 60 : 0) + 32}px + env(safe-area-inset-bottom, 0px))`,
        }}
      >
        {/* Idle */}
        {(game.command === 'idle' || game.command === 'rematch') && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <span
              className="font-display"
              style={{ fontWeight: 800, fontSize: 44, lineHeight: 1, textTransform: 'uppercase' }}
            >
              Waiting to start
            </span>
            <MonoLabel size={9}>Hold tight</MonoLabel>
          </div>
        )}

        {/* Puck drop */}
        <AnimatePresence>
          {game.command === 'starting' && (
            <motion.div
              key="countdown"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-16"
            >
              <span
                className="font-display tabular-nums"
                style={{ fontWeight: 800, fontSize: '38vw', lineHeight: 0.8, color: RED }}
              >
                {game.countdownTime || '·'}
              </span>
              <MonoLabel size={10} tracking="0.3em">
                Get ready
              </MonoLabel>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Classic ── */}
        {isActive && gameMode === 'classic' && currentQuestion && (
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex flex-col gap-4"
          >
            <div className="flex items-end justify-between gap-3">
              <span
                className="font-display min-w-0 flex-1 text-[clamp(26px,8vw,38px)]"
                style={{ fontWeight: 800, lineHeight: 1, textTransform: 'uppercase' }}
              >
                {MODE_TITLES.classic}
              </span>
              {isAnswering && (
                <span className="shrink-0">
                  <Clock seconds={questionTimeLeft} size={38} label={null} />
                </span>
              )}
            </div>

            <StatsCard
              question={currentQuestion}
              revealedColumns={isRevealing ? 5 : (game.revealedColumns ?? 0)}
              size="phone"
            />

            {isAnswering && (
              <PlayerGuessInput
                answerMode={game.answerMode}
                choices={choices}
                eliminatedChoices={myEliminated}
                hasAnswered={hasAnswered}
                answeredCount={answeredCount}
                totalPlayers={connectedPlayers.length}
                selected={mySelected}
                onSubmit={handleAnswer}
              />
            )}

            {isRevealing && (
              <RevealResult
                question={currentQuestion}
                history={history}
                myId={myId}
              />
            )}

          </motion.div>
        )}

        {/* ── Career ── */}
        {isActive && gameMode === 'career' && careerSeasons.length > 0 && (
          <motion.div
            key={`career-${game.currentQuestionIndex}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex flex-col gap-4"
          >
            <div className="flex items-end justify-between gap-3">
              <span
                className="font-display"
                style={{ fontWeight: 800, fontSize: 34, lineHeight: 1, textTransform: 'uppercase' }}
              >
                {MODE_TITLES.career}
              </span>
              <div className="flex items-end gap-3">
                <MonoLabel size={9}>
                  Round {(game.currentQuestionIndex ?? 0) + 1} / {game.questionCount}
                </MonoLabel>
              </div>
            </div>

            <div className="on-ice overflow-x-auto p-4">
              <CareerRevealCard
                seasons={careerSeasons}
                revealedCount={isRevealing ? careerSeasons.length : revealedSeasonCount}
                showYears={isRevealing || game.careerShowYears !== false}
                buzzedInPlayerName={
                  buzzedInPlayerId && buzzedInPlayerId !== myId
                    ? players.find((p) => p.id === buzzedInPlayerId)?.name
                    : undefined
                }
                lockedOutCount={lockedOutPlayers.length}
              />
            </div>

          </motion.div>
        )}

        {isAnswering && (gameMode === 'classic' || gameMode === 'career') && currentQuestion && game.hintsEnabled && (
          <div className="on-ice p-4">
            <HintPanel
              question={currentQuestion}
              usedHints={sharedHints}
              hintsEnabled={game.hintsEnabled}
              showEraHint={gameMode !== 'career' || game.careerShowYears === false}
              onRequestHint={handleHint}
            />
          </div>
        )}

        {/* Keep the fixed buzzer outside the animated card's transformed container. */}
        {isAnswering && gameMode === 'career' && careerSeasons.length > 0 && (
          <BuzzInButton
            playerId={myId}
            buzzedInPlayerId={buzzedInPlayerId}
            penaltySeconds={penalties[myId] ?? 0}
            penaltyEndsAt={game.careerPenaltyEndsAt?.[myId]}
            pausedAt={game.pausedAt}
            onBuzzIn={handleBuzzIn}
            onCancel={() => cancelCareerBuzz({ playerId: myId })}
            onSubmitAnswer={handleCareerAnswer}
          />
        )}

        {/* ── Head-to-Head ── */}
        {isActive && gameMode === 'h2h' && h2hCurrentPair && (
          <motion.div
            key={`h2h-${game.currentQuestionIndex}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex flex-col gap-4"
          >
            <div className="flex items-end justify-between gap-3">
              <span
                className="font-display"
                style={{ fontWeight: 800, fontSize: 32, lineHeight: 1, textTransform: 'uppercase' }}
              >
                {MODE_TITLES.h2h}
              </span>
              {isAnswering && <Clock seconds={questionTimeLeft} size={38} label={null} />}
            </div>

            <div>
              <H2HComparisonCard
                pair={h2hCurrentPair}
                myAnswer={mySelected}
                revealed={isRevealing}
                onAnswer={(side) => {
                  if (hasAnswered) return
                  submitAnswer({ playerId: myId, answer: side })
                }}
              />
            </div>

            <RoundStatus
              isRevealing={isRevealing}
              history={history}
              myId={myId}
              hasAnswered={hasAnswered}
              answeredCount={answeredCount}
              totalPlayers={connectedPlayers.length}
            />
          </motion.div>
        )}

        {/* ── Higher / Lower ── */}
        {isActive && gameMode === 'higher-lower' && hlCurrentPair && (
          <motion.div
            key={`hl-${game.currentQuestionIndex}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex flex-col gap-4"
          >
            <div className="flex items-end justify-between gap-3">
              <span
                className="font-display"
                style={{ fontWeight: 800, fontSize: 34, lineHeight: 1, textTransform: 'uppercase' }}
              >
                {MODE_TITLES['higher-lower']}
              </span>
              {isAnswering && <Clock seconds={questionTimeLeft} size={38} label={null} />}
            </div>

            <div>
              <HigherLowerCard
                pair={hlCurrentPair}
                myAnswer={mySelected}
                revealed={isRevealing}
                onAnswer={(answer) => {
                  if (hasAnswered) return
                  submitAnswer({ playerId: myId, answer })
                }}
              />
            </div>

            <RoundStatus
              isRevealing={isRevealing}
              history={history}
              myId={myId}
              hasAnswered={hasAnswered}
              answeredCount={answeredCount}
              totalPlayers={connectedPlayers.length}
            />
          </motion.div>
        )}

        {/* Standings - hairline rows on a plane, not a floating sidebar. */}
        {connectedPlayers.length >= 2 && (
          <div className="on-ice mt-2">
            <div className="px-3 pt-3 pb-2">
              <MonoLabel size={9}>Standings</MonoLabel>
            </div>
            <Scoreboard players={players} variant="live" myId={myId} />
          </div>
        )}
      </fieldset>

      {/* Power plays own the bottom edge. */}
      {showPowerupBar && (
        <fieldset disabled={isPaused} className="fixed inset-x-0 z-40 m-0 border-0 p-0" style={{ bottom: controls.length ? 60 : 0 }}>
          <div className="mx-auto w-full max-w-[560px]">
            <PowerupBar
              charges={myPowerupCharges}
              answerMode={game.answerMode}
              revealMode={game.revealMode}
              command={game.command}
              activeType={activePowerup?.playerId === myId ? activePowerup.type : null}
              status={myStreak > 1 ? `STREAK ×${myStreak}` : undefined}
              onActivate={handlePowerup}
            />
          </div>
        </fieldset>
      )}

      {/* Host controls - a flush bar, not a floating dock. */}
      {controls.length > 0 && (
        <div
          className="fixed inset-x-0 z-50"
          style={{
            bottom: showCareerBuzzer ? `calc(${BUZZER_HEIGHT}px + env(safe-area-inset-bottom, 0px))` : 0,
            paddingBottom: showCareerBuzzer ? 0 : 'env(safe-area-inset-bottom, 0px)',
            background: INK,
          }}
        >
          <div
            className="mx-auto grid w-full max-w-[560px]"
            style={{ gridTemplateColumns: `repeat(${controls.length}, 1fr)` }}
          >
            {controls.map((c, index) => (
              <button
                key={c.label}
                onClick={c.onClick}
                className="btn-ice font-display flex items-center justify-center gap-2"
                style={{
                  padding: '19px 0',
                  background: c.tone === 'red' ? RED : INK,
                  border: 'none',
                  borderLeft: index > 0 ? '1px solid rgba(238,243,249,0.2)' : undefined,
                  color: c.tone === 'red' ? '#fff' : '#eef3f9',
                  fontWeight: 700,
                  fontSize: 15,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                {c.icon}
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {isRevealing && gameMode === 'career' && currentQuestion && (
        <CareerAnswerPopover
          key={`career-answer-${game.currentQuestionIndex}`}
          question={currentQuestion}
          seasons={careerSeasons}
          result={history[history.length - 1]?.playerAnswers?.[myId]}
          onNext={isController ? () => advanceToNext(myId) : undefined}
        />
      )}
    </main>
  )
}

// ─── Reveal result ────────────────────────────────────────────────────────────
// State is never carried by colour alone: the outcome is spelled out in words
// and the answer is always stated, whether you got it or not.

// ─── Round status (h2h / higher-lower) ────────────────────────────────────────

function RoundStatus({
  isRevealing,
  history,
  myId,
  hasAnswered,
  answeredCount,
  totalPlayers,
}: {
  isRevealing: boolean
  history: QuestionResult[]
  myId: string
  hasAnswered: boolean
  answeredCount: number
  totalPlayers: number
}) {
  if (!isRevealing) {
    return (
      <div className="flex items-baseline justify-between">
        <MonoLabel size={9}>{hasAnswered ? 'Answer locked' : 'Pick one'}</MonoLabel>
        <MonoLabel size={9} tracking="0.14em">
          {answeredCount} / {totalPlayers} in
        </MonoLabel>
      </div>
    )
  }

  const latest = history.length > 0 ? history[history.length - 1] : null
  const myResult = latest?.playerAnswers?.[myId]
  const isCorrect = myResult?.correct ?? false
  const points = myResult?.points ?? 0

  return (
    <div
      className="on-ice flex items-baseline justify-between p-4"
      style={{ borderLeft: `5px solid ${isCorrect ? RED : '#b3c0cf'}` }}
    >
      <span
        className="font-display"
        style={{
          fontWeight: 800,
          fontSize: 28,
          lineHeight: 1,
          textTransform: 'uppercase',
          color: isCorrect ? RED : INK,
        }}
      >
        {!hasAnswered ? 'No answer' : isCorrect ? 'Correct' : 'Missed'}
      </span>
      {points !== 0 && (
        <span
          className="font-display tabular-nums"
          style={{ fontWeight: 800, fontSize: 24, color: points > 0 ? RED : INK }}
        >
          {points > 0 ? `+${points}` : points}
        </span>
      )}
    </div>
  )
}

// ─── Question history ─────────────────────────────────────────────────────────

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
    <div className="flex flex-col gap-3">
      <MonoLabel size={9}>Round recap</MonoLabel>

      {history.map((entry, i) => {
        const q = entry.question
        return (
          <div key={q.id + i} className="on-ice flex flex-col gap-3 p-4">
            <div className="flex items-baseline gap-3">
              <MonoLabel size={9} tracking="0.2em">
                Q{i + 1}
              </MonoLabel>
              <span
                className="font-display flex-1 truncate"
                style={{ fontWeight: 700, fontSize: 22, textTransform: 'uppercase' }}
              >
                {gameMode === 'higher-lower' ? 'Higher or lower' : `${q.firstName} ${q.lastName}`}
              </span>
              {(gameMode === 'classic' || gameMode === 'career') && (
                <MonoLabel size={9} tracking="0.14em">
                  {q.season} · {q.points} PTS
                </MonoLabel>
              )}
            </div>

            <div className="flex flex-col">
              {players.map((player) => {
                const result = entry.playerAnswers[player.id]
                if (!result) return null
                return (
                  <div
                    key={player.id}
                    className="flex items-center gap-3 py-1.5"
                    style={{
                      borderBottom: '1px solid rgba(13,27,42,0.07)',
                      borderLeft: `4px solid ${player.id === myId ? INK : 'transparent'}`,
                      paddingLeft: 8,
                    }}
                  >
                    <span
                      className="font-display flex-1 truncate"
                      style={{ fontWeight: 700, fontSize: 17, textTransform: 'uppercase' }}
                    >
                      {player.name}
                    </span>
                    <span className="max-w-[130px] truncate">
                      <MonoLabel size={9} tracking="0.1em">
                        {result.correct ? 'CORRECT' : result.answer || 'NO ANSWER'}
                      </MonoLabel>
                    </span>
                    <span
                      className="font-display tabular-nums"
                      style={{
                        fontWeight: 800,
                        fontSize: 19,
                        width: 46,
                        textAlign: 'right',
                        color: result.points > 0 ? RED : '#55677d',
                      }}
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
