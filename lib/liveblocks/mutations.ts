'use client'

import { LiveList, LiveObject } from '@liveblocks/client'
import { useMutation } from './client'
import type {
  GameState,
  Player,
  GameSetupConfig,
  PowerupType,
  Question,
  QuestionResult,
  DifficultyTier,
} from '@/types/game'
import {
  SCORE_BASE_BY_TIER,
  SCORE_SPEED_MAX,
  SCORE_SPEED_WINDOW_MS,
  SCORE_DOUBLEDOWN_WRONG,
  POWERUP_INITIAL_CHARGES,
} from '@/types/game'
import { getAvatarUrl } from '@/lib/avatar'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGame(storage: Parameters<Parameters<typeof useMutation>[0]>[0]['storage']) {
  return storage.get('game') as unknown as LiveObject<GameState>
}

function getPlayers(game: LiveObject<GameState>): LiveList<Player> {
  let players = game.get('players') as unknown as LiveList<Player>
  if (Array.isArray(players)) {
    const newList = new LiveList<Player>(players)
    game.set('players', newList as unknown as Player[])
    players = newList
  }
  return players
}

function getPlayedQuestions(game: LiveObject<GameState>): LiveList<Question> {
  let played = game.get('playedQuestions') as unknown as LiveList<Question>
  if (Array.isArray(played)) {
    const newList = new LiveList<Question>(played)
    game.set('playedQuestions', newList as unknown as Question[])
    played = newList
  }
  return played
}

function normalizeAnswer(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ')
}

function isCorrectAnswer(answer: string, question: Question): boolean {
  if (!answer) return false
  const norm = normalizeAnswer(answer)
  const fullName = normalizeAnswer(`${question.firstName} ${question.lastName}`)
  const lastName = normalizeAnswer(question.lastName)
  return norm === fullName || norm === lastName
}

function calcScore(
  elapsedMs: number,
  difficulty: import('@/types/game').DifficultyTier,
  doubleDown: boolean,
  correct: boolean,
): number {
  if (!correct) return doubleDown ? SCORE_DOUBLEDOWN_WRONG : 0
  const base = SCORE_BASE_BY_TIER[difficulty] ?? 100
  const speedBonus = Math.round(
    SCORE_SPEED_MAX * Math.max(0, 1 - elapsedMs / SCORE_SPEED_WINDOW_MS),
  )
  const earned = base + speedBonus
  return doubleDown ? earned * 2 : earned
}

// ─── Join Game ────────────────────────────────────────────────────────────────

export function useJoinGame() {
  return useMutation(
    ({ storage }, { id, name }: { id: string; name: string }) => {
      const game = getGame(storage)
      if (!game) return

      const players = getPlayers(game)
      let alreadyJoined = false
      players.forEach((p) => {
        if (p.id === id) alreadyJoined = true
      })
      if (alreadyJoined) return

      const hostId = game.get('hostId') as string
      const isHost = hostId === '' || hostId === id

      // First joiner becomes host
      if (hostId === '') {
        game.set('hostId', id)
      }

      players.push({
        id,
        name,
        avatarUrl: getAvatarUrl(id),
        score: 0,
        isHost,
        isBoss: false,
        isConnected: true,
      })
    },
    [],
  )
}

// ─── Claim Boss ───────────────────────────────────────────────────────────────

export function useClaimBoss() {
  return useMutation(
    ({ storage }, { playerId, token }: { playerId: string; token: string }) => {
      const game = getGame(storage)
      if (!game) return

      const storedToken = game.get('bossToken') as string
      if (!storedToken || storedToken !== token) return

      game.set('bossId', playerId)

      const players = getPlayers(game)
      players.forEach((p, i) => {
        if (p.id === playerId) {
          players.set(i, { ...p, isBoss: true })
        }
      })
    },
    [],
  )
}

// ─── Save Settings ────────────────────────────────────────────────────────────

export function useSaveSettings() {
  return useMutation(
    (
      { storage },
      { config, requesterId }: { config: GameSetupConfig; requesterId: string },
    ) => {
      const game = getGame(storage)
      if (!game) return

      const hostId = game.get('hostId') as string
      const bossId = game.get('bossId') as string
      if (requesterId !== hostId && requesterId !== bossId) return

      game.set('questionCount', config.questionCount)
      game.set('answerMode', config.answerMode)
      game.set('difficultyTiers', config.difficultyTiers as unknown as DifficultyTier[])
      game.set('eras', config.eras as unknown as string[])
      game.set('revealMode', config.revealMode)
      game.set('hintsEnabled', config.hintsEnabled)
      game.set('powerupsEnabled', config.powerupsEnabled)
    },
    [],
  )
}

// ─── Start Game ───────────────────────────────────────────────────────────────

export function useStartGame() {
  return useMutation(
    (
      { storage },
      {
        requesterId,
        questionSequence,
        bossToken,
      }: {
        requesterId: string
        questionSequence: Question[]
        bossToken: string
      },
    ) => {
      const game = getGame(storage)
      if (!game) return

      const hostId = game.get('hostId') as string
      const bossId = game.get('bossId') as string
      if (requesterId !== hostId && requesterId !== bossId) return

      const powerupsEnabled = game.get('powerupsEnabled') as boolean

      // Initialize powerups for each player
      const players = getPlayers(game)
      const playerPowerups: Record<string, Record<string, number>> = {}
      if (powerupsEnabled) {
        players.forEach((p) => {
          playerPowerups[p.id] = { ...POWERUP_INITIAL_CHARGES }
        })
      }

      game.set('questionSequence', questionSequence as unknown as Question[])
      game.set('currentQuestionIndex', -1)
      game.set('command', 'starting')
      game.set('countdownTime', 3)
      game.set('bossToken', bossToken)
      game.set('playerPowerups', playerPowerups as unknown as Record<string, Record<string, number>>)
      game.set('playedQuestions', new LiveList([]) as unknown as Question[])
      game.set('reveal', false)
    },
    [],
  )
}

// ─── Tick Countdown ──────────────────────────────────────────────────────────

export function useTickCountdown() {
  return useMutation(({ storage }, requesterId: string) => {
    const game = getGame(storage)
    if (!game) return

    const hostId = game.get('hostId') as string
    if (requesterId !== hostId) return

    const current = (game.get('countdownTime') as number) ?? 0
    if (current <= 1) {
      game.set('countdownTime', 0)
      game.set('command', 'question')
    } else {
      game.set('countdownTime', current - 1)
    }
  }, [])
}

// ─── Next Question ────────────────────────────────────────────────────────────

export function useNextQuestion() {
  return useMutation(
    (
      { storage },
      {
        requesterId,
        choices,
      }: { requesterId: string; choices: string[] },
    ) => {
      const game = getGame(storage)
      if (!game) return

      const hostId = game.get('hostId') as string
      const bossId = game.get('bossId') as string
      if (requesterId !== hostId && requesterId !== bossId) return

      const command = game.get('command') as string
      if (command !== 'question' && command !== 'next' && command !== 'starting') return

      const sequence = (game.get('questionSequence') as unknown as Question[]) || []
      const currentIndex = ((game.get('currentQuestionIndex') as number) ?? -1) + 1

      if (currentIndex >= sequence.length) {
        game.set('command', 'finished')
        return
      }

      const question = sequence[currentIndex]
      const revealMode = game.get('revealMode') as string

      game.set('currentQuestion', question as unknown as Question)
      game.set('currentQuestionIndex', currentIndex)
      game.set('revealedColumns', 5)
      game.set('questionStartsAt', new Date().toISOString())
      game.set('choices', choices as unknown as string[])
      game.set('answers', {} as unknown as Record<string, string>)
      game.set('answeredAt', {} as unknown as Record<string, number>)
      game.set('hintsUsed', [] as unknown as string[])
      game.set('eliminatedChoices', [] as unknown as string[])
      game.set('freezeActive', false)
      game.set('activePowerup', null)
      game.set('command', 'answering')
    },
    [],
  )
}

// ─── Reveal Next Column ───────────────────────────────────────────────────────

export function useRevealNextColumn() {
  return useMutation(({ storage }, requesterId: string) => {
    const game = getGame(storage)
    if (!game) return

    const hostId = game.get('hostId') as string
    if (requesterId !== hostId) return

    const freezeActive = game.get('freezeActive') as boolean
    if (freezeActive) return

    const current = (game.get('revealedColumns') as number) ?? 0
    if (current < 5) {
      game.set('revealedColumns', current + 1)
    }
  }, [])
}

// ─── Submit Answer ────────────────────────────────────────────────────────────

export function useSubmitAnswer() {
  return useMutation(
    ({ storage }, { playerId, answer }: { playerId: string; answer: string }) => {
      const game = getGame(storage)
      if (!game) return

      const command = game.get('command') as string
      if (command !== 'answering') return

      const existingAnswers = (game.get('answers') as unknown as Record<string, string>) || {}
      if (existingAnswers[playerId] !== undefined) return // already answered

      const questionStartsAt = game.get('questionStartsAt') as string
      const startTime = questionStartsAt ? new Date(questionStartsAt).getTime() : Date.now()
      const elapsedMs = Date.now() - startTime

      const newAnswers = { ...existingAnswers, [playerId]: answer }
      game.set('answers', newAnswers as unknown as Record<string, string>)

      const existingAnsweredAt =
        (game.get('answeredAt') as unknown as Record<string, number>) || {}
      game.set('answeredAt', {
        ...existingAnsweredAt,
        [playerId]: elapsedMs,
      } as unknown as Record<string, number>)

    },
    [],
  )
}

// ─── Reveal Answers ──────────────────────────────────────────────────────────

export function useRevealAnswers() {
  return useMutation(({ storage }, requesterId: string) => {
    const game = getGame(storage)
    if (!game) return

    const hostId = game.get('hostId') as string
    const bossId = game.get('bossId') as string
    if (requesterId !== hostId && requesterId !== bossId) return

    const currentQuestion = game.get('currentQuestion') as unknown as Question
    if (!currentQuestion) return

    const answers = (game.get('answers') as unknown as Record<string, string>) || {}
    const answeredAt = (game.get('answeredAt') as unknown as Record<string, number>) || {}
    const playerPowerups =
      (game.get('playerPowerups') as unknown as Record<string, Record<string, number>>) || {}

    const players = getPlayers(game)

    const historyEntry: QuestionResult = {
      question: currentQuestion,
      playerAnswers: {},
    }

    players.forEach((player, index) => {
      const answer = answers[player.id] || ''
      const elapsed = answeredAt[player.id] ?? SCORE_SPEED_WINDOW_MS
      const usedDoubleDown = (playerPowerups[player.id]?.doubledown ?? POWERUP_INITIAL_CHARGES.doubledown) === 0
      const correct = isCorrectAnswer(answer, currentQuestion)
      const points = calcScore(elapsed, currentQuestion.difficulty, usedDoubleDown, correct)

      historyEntry.playerAnswers[player.id] = { answer, points, correct }

      if (points !== 0) {
        players.set(index, { ...player, score: player.score + points })
      }
    })

    // Archive current question and results
    const playedQuestions = getPlayedQuestions(game)
    playedQuestions.push(currentQuestion)

    const history = (game.get('questionHistory') as unknown as QuestionResult[]) || []
    game.set('questionHistory', [...history, historyEntry] as unknown as QuestionResult[])

    game.set('reveal', true)
    game.set('command', 'revealing')
  }, [])
}

// ─── Advance to Next ─────────────────────────────────────────────────────────

export function useAdvanceToNext() {
  return useMutation(({ storage }, requesterId: string) => {
    const game = getGame(storage)
    if (!game) return

    const hostId = game.get('hostId') as string
    const bossId = game.get('bossId') as string
    if (requesterId !== hostId && requesterId !== bossId) return

    const currentIndex = (game.get('currentQuestionIndex') as number) ?? 0
    const sequence = (game.get('questionSequence') as unknown as Question[]) || []
    const questionCount = (game.get('questionCount') as number) ?? sequence.length

    game.set('reveal', false)

    if (currentIndex + 1 >= Math.min(questionCount, sequence.length)) {
      game.set('command', 'finished')
    } else {
      game.set('command', 'next')
    }
  }, [])
}

// ─── Request Hint ─────────────────────────────────────────────────────────────

export function useRequestHint() {
  return useMutation(
    ({ storage }, { hintType }: { hintType: string }) => {
      const game = getGame(storage)
      if (!game) return

      const hintsEnabled = game.get('hintsEnabled') as boolean
      if (!hintsEnabled) return

      const hintsUsed = (game.get('hintsUsed') as unknown as string[]) || []
      if (hintsUsed.includes(hintType)) return // already revealed

      game.set('hintsUsed', [...hintsUsed, hintType] as unknown as string[])
    },
    [],
  )
}

// ─── Activate Powerup ────────────────────────────────────────────────────────

export function useActivatePowerup() {
  return useMutation(
    (
      { storage },
      { playerId, powerupType }: { playerId: string; powerupType: PowerupType },
    ) => {
      const game = getGame(storage)
      if (!game) return

      const powerupsEnabled = game.get('powerupsEnabled') as boolean
      if (!powerupsEnabled) return

      const command = game.get('command') as string
      if (command !== 'answering') return

      const playerPowerups =
        (game.get('playerPowerups') as unknown as Record<string, Record<string, number>>) || {}
      const charges = playerPowerups[playerId]?.[powerupType] ?? 0
      if (charges <= 0) return

      // Validate powerup availability
      const answerMode = game.get('answerMode') as string
      const revealMode = game.get('revealMode') as string

      if (powerupType === 'eliminate' && answerMode !== 'multiplechoice') return
      if (powerupType === 'freeze' && revealMode !== 'timed') return
      if (powerupType === 'extrahint' && revealMode !== 'timed') return

      // Decrement charge
      const updatedPowerups = {
        ...playerPowerups,
        [playerId]: {
          ...(playerPowerups[playerId] || {}),
          [powerupType]: charges - 1,
        },
      }
      game.set(
        'playerPowerups',
        updatedPowerups as unknown as Record<string, Record<string, number>>,
      )

      game.set('activePowerup', { type: powerupType, playerId } as unknown as {
        type: PowerupType
        playerId: string
      })

      // Apply effect immediately for some powerups
      switch (powerupType) {
        case 'freeze':
          game.set('freezeActive', true)
          break

        case 'extrahint': {
          const current = (game.get('revealedColumns') as number) ?? 0
          if (current < 5) game.set('revealedColumns', current + 1)
          break
        }

        case 'eliminate': {
          const choices = (game.get('choices') as unknown as string[]) || []
          const currentQuestion = game.get('currentQuestion') as unknown as Question
          if (!currentQuestion) break
          const correctName = `${currentQuestion.firstName} ${currentQuestion.lastName}`
          const wrongChoices = choices.filter((c) => c !== correctName)
          const toEliminate = wrongChoices.sort(() => Math.random() - 0.5).slice(0, 2)
          game.set('eliminatedChoices', toEliminate as unknown as string[])
          break
        }

        // doubledown: no immediate effect — applied in useRevealAnswers
      }
    },
    [],
  )
}

// ─── Finish Game ─────────────────────────────────────────────────────────────

export function useFinishGame() {
  return useMutation(({ storage }, requesterId: string) => {
    const game = getGame(storage)
    if (!game) return

    const hostId = game.get('hostId') as string
    const bossId = game.get('bossId') as string
    if (requesterId !== hostId && requesterId !== bossId) return

    game.set('command', 'finished')
  }, [])
}

// ─── Rematch ─────────────────────────────────────────────────────────────────

export function useRematch() {
  return useMutation(({ storage }, requesterId: string) => {
    const game = getGame(storage)
    if (!game) return

    const hostId = game.get('hostId') as string
    const bossId = game.get('bossId') as string
    if (requesterId !== hostId && requesterId !== bossId) return

    // Reset scores
    const players = getPlayers(game)
    players.forEach((p, i) => {
      players.set(i, { ...p, score: 0 })
    })

    game.set('command', 'rematch')
    game.set('currentQuestion', null)
    game.set('currentQuestionIndex', -1)
    game.set('questionSequence', [] as unknown as Question[])
    game.set('playedQuestions', new LiveList([]) as unknown as Question[])
    game.set('answers', {} as unknown as Record<string, string>)
    game.set('answeredAt', {} as unknown as Record<string, number>)
    game.set('hintsUsed', [] as unknown as string[])
    game.set('playerPowerups', {} as unknown as Record<string, Record<string, number>>)
    game.set('eliminatedChoices', [] as unknown as string[])
    game.set('freezeActive', false)
    game.set('activePowerup', null)
    game.set('reveal', false)
    game.set('revealedColumns', 0)
    game.set('questionHistory', [] as unknown as QuestionResult[])
  }, [])
}
