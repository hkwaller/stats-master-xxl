'use client'

import { useEffect, useState } from 'react'
import type { CareerQuestion, GameState, Player, Question } from '@/types/game'
import { CAREER_REVEAL_INTERVAL_MS } from '@/types/game'

type Mutations = {
  refreshCareerData: (args: { requesterId: string; careers: CareerQuestion[] }) => void
  tickCountdown: (id: string) => void
  nextQuestion: (args: { requesterId: string; choices: string[] }) => void
  nextCareerRound: (args: { requesterId: string }) => void
  revealNextCareerSeason: (id: string) => void
  revealCareerAnswer: (id: string) => void
  nextH2HRound: (args: { requesterId: string }) => void
  nextHLRound: (args: { requesterId: string }) => void
  revealAnswers: (id: string) => void
  revealH2HAnswers: (id: string) => void
  revealHLAnswers: (id: string) => void
}

/**
 * Drives the host-side state machine: countdown, question loading, auto-reveal.
 * Used by both /player/[id] (host-as-player) and /game/ (host-only view).
 */
export function useHostStateMachine(
  isHost: boolean,
  myId: string,
  game: GameState | null,
  mutations: Mutations,
) {
  const {
    refreshCareerData,
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
  } = mutations

  const gameMode = game?.gameMode ?? 'classic'
  const careerSeasons = (game?.careerSeasons as unknown as Question[]) ?? []
  const revealedSeasonCount = game?.revealedSeasonCount ?? 0
  const answeredCount = Object.keys(game?.answers ?? {}).length

  const [refreshAttempt, setRefreshAttempt] = useState(0)
  const careerData = (game?.careerData as unknown as CareerQuestion[]) ?? []
  const needsCareerRefresh = careerData.some((c) => !c.fullCareer)
  const careerPlayerIds = careerData.map((c) => c.playerId).join(',')

  useEffect(() => {
    if (!isHost || gameMode !== 'career' || !needsCareerRefresh) return
    const controller = new AbortController()
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    async function refresh() {
      try {
        const res = await fetch('/api/questions/generate-career', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerIds: careerPlayerIds.split(',').map(Number) }),
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('Could not restore full careers')
        const { careerData: careers } = await res.json() as { careerData: CareerQuestion[] }
        if (!controller.signal.aborted) refreshCareerData({ requesterId: myId, careers })
      } catch {
        if (!controller.signal.aborted) {
          retryTimer = setTimeout(() => setRefreshAttempt((attempt) => attempt + 1), 5000)
        }
      }
    }
    void refresh()
    return () => { controller.abort(); clearTimeout(retryTimer) }
  }, [isHost, gameMode, needsCareerRefresh, careerPlayerIds, myId, refreshCareerData, refreshAttempt])

  // Countdown ticker
  useEffect(() => {
    if (!isHost || !game) return
    if (game.command !== 'starting' || game.countdownTime <= 0) return
    const timer = setTimeout(() => tickCountdown(myId), 1000)
    return () => clearTimeout(timer)
  }, [isHost, game?.command, game?.countdownTime, myId, tickCountdown])

  // Classic: launch first/next question
  useEffect(() => {
    if (!isHost || !game || gameMode !== 'classic') return
    if (game.command !== 'question' && game.command !== 'next') return
    const sequence = (game.questionSequence as unknown as Question[]) ?? []
    const nextIndex = (game.currentQuestionIndex ?? -1) + 1
    if (nextIndex >= sequence.length) return
    const nextQ = sequence[nextIndex]
    nextQuestion({ requesterId: myId, choices: nextQ.choices ?? [] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, game?.command, gameMode])

  // Career: launch next career round
  useEffect(() => {
    if (!isHost || !game || gameMode !== 'career' || needsCareerRefresh) return
    if (game.command !== 'question' && game.command !== 'next') return
    nextCareerRound({ requesterId: myId })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, game?.command, gameMode, needsCareerRefresh])

  // Career: reveal time pauses while the answering slot is occupied.
  useEffect(() => {
    if (!isHost || !game || gameMode !== 'career' || needsCareerRefresh) return
    if (game.command !== 'answering') return
    if (careerSeasons.length === 0 || game.buzzedInPlayerId) return

    // Schedule from the shared start time so render/network delays do not
    // accumulate. The final season also gets a full interval before time expires.
    const deadline = new Date(game.questionStartsAt).getTime() +
      (game.careerPausedDurationMs ?? 0) + revealedSeasonCount * CAREER_REVEAL_INTERVAL_MS
    const timer = setTimeout(() => {
      if (revealedSeasonCount >= careerSeasons.length) {
        revealCareerAnswer(myId)
      } else {
        revealNextCareerSeason(myId)
      }
    }, Math.max(0, deadline - Date.now()))

    return () => clearTimeout(timer)
  }, [isHost, game?.command, game?.questionStartsAt, gameMode, revealedSeasonCount,
    careerSeasons.length, myId, revealNextCareerSeason, revealCareerAnswer, needsCareerRefresh,
    game?.buzzedInPlayerId, game?.careerPausedDurationMs])

  // H2H: launch next round
  useEffect(() => {
    if (!isHost || !game || gameMode !== 'h2h') return
    if (game.command !== 'question' && game.command !== 'next') return
    nextH2HRound({ requesterId: myId })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, game?.command, gameMode])

  // HL: launch next round
  useEffect(() => {
    if (!isHost || !game || gameMode !== 'higher-lower') return
    if (game.command !== 'question' && game.command !== 'next') return
    nextHLRound({ requesterId: myId })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, game?.command, gameMode])

  // Auto-reveal when all connected players have answered (non-career)
  useEffect(() => {
    if (!isHost || !game) return
    if (gameMode === 'career') return
    if (game.command !== 'answering') return
    const allPlayers = (game.players as unknown as Player[]) ?? []
    const connectedCount = allPlayers.filter((p) => p.isConnected).length
    if (connectedCount > 0 && answeredCount >= connectedCount) {
      if (gameMode === 'h2h') {
        revealH2HAnswers(myId)
      } else if (gameMode === 'higher-lower') {
        revealHLAnswers(myId)
      } else {
        revealAnswers(myId)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, game?.command, answeredCount, gameMode, myId])
}
