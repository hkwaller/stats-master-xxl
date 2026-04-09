'use client'

import { useEffect } from 'react'
import type { GameState, Player, Question } from '@/types/game'
import { CAREER_REVEAL_INTERVAL_MS } from '@/types/game'

type Mutations = {
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
    if (!isHost || !game || gameMode !== 'career') return
    if (game.command !== 'question' && game.command !== 'next') return
    nextCareerRound({ requesterId: myId })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, game?.command, gameMode])

  // Career: reveal timer — reveals one season every CAREER_REVEAL_INTERVAL_MS
  useEffect(() => {
    if (!isHost || !game || gameMode !== 'career') return
    if (game.command !== 'answering') return
    if (careerSeasons.length === 0) return

    if (revealedSeasonCount >= careerSeasons.length) {
      revealCareerAnswer(myId)
      return
    }

    const timer = setTimeout(() => {
      revealNextCareerSeason(myId)
    }, CAREER_REVEAL_INTERVAL_MS)

    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, game?.command, gameMode, revealedSeasonCount, careerSeasons.length])

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
