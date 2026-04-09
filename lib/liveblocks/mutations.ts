'use client'

import { LiveList, LiveObject } from '@liveblocks/client'
import { useMutation } from './client'
import type {
  CareerQuestion,
  GameMode,
  GameSetupConfig,
  GameState,
  H2HPair,
  HLPair,
  Player,
  PowerupType,
  Question,
  QuestionResult,
  DifficultyTier,
} from '@/types/game'
import {
  CAREER_SCORE_TIERS,
  H2H_SCORE_CORRECT,
  H2H_SCORE_SPEED_MAX,
  HL_SCORE_CORRECT,
  HL_SCORE_SPEED_MAX,
  POWERUP_INITIAL_CHARGES,
  SCORE_BASE_BY_TIER,
  SCORE_DOUBLEDOWN_WRONG,
  SCORE_SPEED_MAX,
  SCORE_SPEED_WINDOW_MS,
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

// ─── Claim Boss (via shareable token) ────────────────────────────────────────

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
        } else if (p.isBoss) {
          players.set(i, { ...p, isBoss: false })
        }
      })
    },
    [],
  )
}

// ─── Assign Boss (host directly assigns any player as boss) ──────────────────

export function useAssignBoss() {
  return useMutation(
    ({ storage }, { requesterId, playerId }: { requesterId: string; playerId: string | null }) => {
      const game = getGame(storage)
      if (!game) return

      const hostId = game.get('hostId') as string
      if (requesterId !== hostId) return

      game.set('bossId', playerId ?? '')

      const players = getPlayers(game)
      players.forEach((p, i) => {
        const shouldBeBoss = playerId !== null && p.id === playerId
        if (p.isBoss !== shouldBeBoss) {
          players.set(i, { ...p, isBoss: shouldBeBoss })
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

      game.set('gameMode', config.gameMode as unknown as GameMode)
      game.set('questionCount', config.questionCount)
      game.set('answerMode', config.answerMode)
      game.set('difficultyTiers', config.difficultyTiers as unknown as DifficultyTier[])
      game.set('eras', config.eras as unknown as string[])
      game.set('revealMode', config.revealMode)
      game.set('hintsEnabled', config.hintsEnabled)
      game.set('powerupsEnabled', config.powerupsEnabled)
      game.set('rookiesOnly', config.rookiesOnly)
      game.set('careerRevealOrder', config.careerRevealOrder as unknown as import('@/types/game').CareerRevealOrder)
      game.set('careerMinSeasons', config.careerMinSeasons)
      game.set('careerMaxReveals', config.careerMaxReveals)
      game.set('hlComparisonField', config.hlComparisonField as unknown as import('@/types/game').HLComparisonField)
      game.set('hostPlays', config.hostPlays)
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
        gameMode,
        careerData,
        h2hPairs,
        hlPairs,
      }: {
        requesterId: string
        questionSequence: Question[]
        bossToken: string
        gameMode?: GameMode
        careerData?: CareerQuestion[]
        h2hPairs?: H2HPair[]
        hlPairs?: HLPair[]
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

      if (gameMode) game.set('gameMode', gameMode as unknown as GameMode)

      // Store mode-specific data
      game.set('careerData', (careerData ?? []) as unknown as CareerQuestion[])
      game.set('h2hPairs', (h2hPairs ?? []) as unknown as H2HPair[])
      game.set('hlPairs', (hlPairs ?? []) as unknown as HLPair[])

      // Reset per-round state
      game.set('careerSeasons', [] as unknown as Question[])
      game.set('revealedSeasonCount', 0)
      game.set('buzzedInPlayerId', '')
      game.set('buzzedInSeasonCount', 0)
      game.set('lockedOutPlayers', [] as unknown as string[])
      game.set('h2hCurrentPair', null)
      game.set('hlCurrentPair', null)
      game.set('questionHistory', [] as unknown as QuestionResult[])
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

// ─── Classic: Next Question ───────────────────────────────────────────────────

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

      game.set('currentQuestion', question as unknown as Question)
      game.set('currentQuestionIndex', currentIndex)
      game.set('revealedColumns', 5)
      game.set('questionStartsAt', new Date().toISOString())
      game.set('choices', choices as unknown as string[])
      game.set('answers', {} as unknown as Record<string, string>)
      game.set('answeredAt', {} as unknown as Record<string, number>)
      game.set('hintsUsed', [] as unknown as string[])
      game.set('playerEliminatedChoices', {} as unknown as Record<string, string[]>)
      game.set('freezeActive', false)
      game.set('activePowerup', null)
      game.set('command', 'answering')
    },
    [],
  )
}

// ─── Reveal Next Column (classic timed reveal) ───────────────────────────────

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

// ─── Classic: Submit Answer ───────────────────────────────────────────────────

export function useSubmitAnswer() {
  return useMutation(
    ({ storage }, { playerId, answer }: { playerId: string; answer: string }) => {
      const game = getGame(storage)
      if (!game) return

      const command = game.get('command') as string
      if (command !== 'answering') return

      const existingAnswers = (game.get('answers') as unknown as Record<string, string>) || {}
      if (existingAnswers[playerId] !== undefined) return

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

// ─── Classic: Reveal Answers ──────────────────────────────────────────────────

export function useRevealAnswers() {
  return useMutation(({ storage }, requesterId: string) => {
    const game = getGame(storage)
    if (!game) return

    const hostId = game.get('hostId') as string
    const bossId = game.get('bossId') as string
    if (requesterId !== hostId && requesterId !== bossId) return

    const command = game.get('command') as string
    if (command !== 'answering') return

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

// ─── Skip Question ────────────────────────────────────────────────────────────

export function useSkipQuestion() {
  return useMutation(({ storage }, requesterId: string) => {
    const game = getGame(storage)
    if (!game) return

    const hostId = game.get('hostId') as string
    const bossId = game.get('bossId') as string
    if (requesterId !== hostId && requesterId !== bossId) return

    const command = game.get('command') as string
    if (command !== 'answering') return

    const currentIndex = (game.get('currentQuestionIndex') as number) ?? 0
    const sequence = (game.get('questionSequence') as unknown as Question[]) || []
    const questionCount = (game.get('questionCount') as number) ?? sequence.length

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
      if (hintsUsed.includes(hintType)) return

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

      const answerMode = game.get('answerMode') as string
      const revealMode = game.get('revealMode') as string
      const gameMode = game.get('gameMode') as string

      // Powerups only available in classic mode
      if (gameMode !== 'classic') return
      if (powerupType === 'eliminate' && answerMode !== 'multiplechoice') return
      if (powerupType === 'freeze' && revealMode !== 'timed') return
      if (powerupType === 'extrahint' && revealMode !== 'timed') return

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
          const existing = (game.get('playerEliminatedChoices') as unknown as Record<string, string[]>) || {}
          game.set('playerEliminatedChoices', {
            ...existing,
            [playerId]: toEliminate,
          } as unknown as Record<string, string[]>)
          break
        }
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
    game.set('playerEliminatedChoices', {} as unknown as Record<string, string[]>)
    game.set('freezeActive', false)
    game.set('activePowerup', null)
    game.set('reveal', false)
    game.set('revealedColumns', 0)
    game.set('questionHistory', [] as unknown as QuestionResult[])
    // Mode-specific sequences
    game.set('careerData', [] as unknown as CareerQuestion[])
    game.set('h2hPairs', [] as unknown as H2HPair[])
    game.set('hlPairs', [] as unknown as HLPair[])
    game.set('careerSeasons', [] as unknown as Question[])
    game.set('revealedSeasonCount', 0)
    game.set('buzzedInPlayerId', '')
    game.set('buzzedInSeasonCount', 0)
    game.set('lockedOutPlayers', [] as unknown as string[])
    game.set('h2hCurrentPair', null)
    game.set('hlCurrentPair', null)
  }, [])
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAREER MODE
// ═══════════════════════════════════════════════════════════════════════════════

/** Host calls this instead of useNextQuestion when gameMode === 'career' */
export function useNextCareerRound() {
  return useMutation(
    ({ storage }, { requesterId }: { requesterId: string }) => {
      const game = getGame(storage)
      if (!game) return

      const hostId = game.get('hostId') as string
      const bossId = game.get('bossId') as string
      if (requesterId !== hostId && requesterId !== bossId) return

      const command = game.get('command') as string
      if (command !== 'question' && command !== 'next') return

      const careerData = (game.get('careerData') as unknown as CareerQuestion[]) || []
      const currentIndex = ((game.get('currentQuestionIndex') as number) ?? -1) + 1

      if (currentIndex >= careerData.length) {
        game.set('command', 'finished')
        return
      }

      const career = careerData[currentIndex]

      // Use the first season as anchor (has the player's name for scoring)
      const anchor = career.seasons[0]

      game.set('currentQuestion', anchor as unknown as Question)
      game.set('currentQuestionIndex', currentIndex)
      game.set('careerSeasons', career.seasons as unknown as Question[])
      game.set('revealedSeasonCount', 1)         // reveal first season immediately
      game.set('buzzedInPlayerId', '')
      game.set('buzzedInSeasonCount', 0)
      game.set('lockedOutPlayers', [] as unknown as string[])
      game.set('answers', {} as unknown as Record<string, string>)
      game.set('answeredAt', {} as unknown as Record<string, number>)
      game.set('hintsUsed', [] as unknown as string[])
      game.set('questionStartsAt', new Date().toISOString())
      game.set('command', 'answering')
    },
    [],
  )
}

/** Host calls this on a timer to reveal each successive season */
export function useRevealNextCareerSeason() {
  return useMutation(({ storage }, requesterId: string) => {
    const game = getGame(storage)
    if (!game) return

    const hostId = game.get('hostId') as string
    if (requesterId !== hostId) return

    const command = game.get('command') as string
    if (command !== 'answering') return

    const gameMode = game.get('gameMode') as string
    if (gameMode !== 'career') return

    const careerSeasons = (game.get('careerSeasons') as unknown as Question[]) || []
    const current = (game.get('revealedSeasonCount') as number) ?? 0

    if (current < careerSeasons.length) {
      game.set('revealedSeasonCount', current + 1)
    }
  }, [])
}

/** Any non-locked-out player can buzz in to claim the answering slot */
export function useBuzzIn() {
  return useMutation(
    ({ storage }, { playerId }: { playerId: string }) => {
      const game = getGame(storage)
      if (!game) return

      const command = game.get('command') as string
      if (command !== 'answering') return

      const gameMode = game.get('gameMode') as string
      if (gameMode !== 'career') return

      const buzzedInPlayerId = game.get('buzzedInPlayerId') as string
      if (buzzedInPlayerId) return  // already someone buzzing

      const lockedOutPlayers = (game.get('lockedOutPlayers') as unknown as string[]) || []
      if (lockedOutPlayers.includes(playerId)) return

      const revealedSeasonCount = (game.get('revealedSeasonCount') as number) ?? 0

      game.set('buzzedInPlayerId', playerId)
      game.set('buzzedInSeasonCount', revealedSeasonCount)
    },
    [],
  )
}

/** Buzzer submits their answer — scores if correct, locked out if wrong */
export function useSubmitCareerAnswer() {
  return useMutation(
    ({ storage }, { playerId, answer }: { playerId: string; answer: string }) => {
      const game = getGame(storage)
      if (!game) return

      const command = game.get('command') as string
      if (command !== 'answering') return

      const buzzedInPlayerId = game.get('buzzedInPlayerId') as string
      if (buzzedInPlayerId !== playerId) return  // not their turn

      const currentQuestion = game.get('currentQuestion') as unknown as Question
      if (!currentQuestion) return

      const correct = isCorrectAnswer(answer, currentQuestion)

      if (correct) {
        const careerSeasons = (game.get('careerSeasons') as unknown as Question[]) || []
        const buzzedAt = (game.get('buzzedInSeasonCount') as number) ?? 0
        const revealFraction = buzzedAt / Math.max(careerSeasons.length, 1)

        let points: number
        if (revealFraction <= 0.25) points = CAREER_SCORE_TIERS.tier1
        else if (revealFraction <= 0.5) points = CAREER_SCORE_TIERS.tier2
        else if (revealFraction <= 0.75) points = CAREER_SCORE_TIERS.tier3
        else points = CAREER_SCORE_TIERS.tier4

        const players = getPlayers(game)
        const historyEntry: QuestionResult = {
          question: currentQuestion,
          playerAnswers: {},
        }

        players.forEach((player, index) => {
          const isWinner = player.id === playerId
          const pts = isWinner ? points : 0
          historyEntry.playerAnswers[player.id] = {
            answer: isWinner ? answer : '',
            points: pts,
            correct: isWinner,
          }
          if (pts > 0) {
            players.set(index, { ...player, score: player.score + pts })
          }
        })

        const playedQuestions = getPlayedQuestions(game)
        playedQuestions.push(currentQuestion)

        const history = (game.get('questionHistory') as unknown as QuestionResult[]) || []
        game.set('questionHistory', [...history, historyEntry] as unknown as QuestionResult[])
        game.set('reveal', true)
        game.set('buzzedInPlayerId', '')
        game.set('command', 'revealing')
      } else {
        // Wrong — lock out this player and clear buzz slot
        const lockedOutPlayers = (game.get('lockedOutPlayers') as unknown as string[]) || []
        game.set('lockedOutPlayers', [...lockedOutPlayers, playerId] as unknown as string[])
        game.set('buzzedInPlayerId', '')

        // Record wrong answer for history tracking
        const existing = (game.get('answers') as unknown as Record<string, string>) || {}
        game.set('answers', { ...existing, [playerId]: answer } as unknown as Record<string, string>)
      }
    },
    [],
  )
}

/** Host calls this when all career seasons revealed and nobody got it right */
export function useRevealCareerAnswer() {
  return useMutation(({ storage }, requesterId: string) => {
    const game = getGame(storage)
    if (!game) return

    const hostId = game.get('hostId') as string
    if (requesterId !== hostId) return

    const command = game.get('command') as string
    if (command !== 'answering') return

    const gameMode = game.get('gameMode') as string
    if (gameMode !== 'career') return

    const currentQuestion = game.get('currentQuestion') as unknown as Question
    const players = getPlayers(game)

    const historyEntry: QuestionResult = {
      question: currentQuestion,
      playerAnswers: {},
    }

    players.forEach((player) => {
      historyEntry.playerAnswers[player.id] = { answer: '', points: 0, correct: false }
    })

    const playedQuestions = getPlayedQuestions(game)
    if (currentQuestion) playedQuestions.push(currentQuestion)

    const history = (game.get('questionHistory') as unknown as QuestionResult[]) || []
    game.set('questionHistory', [...history, historyEntry] as unknown as QuestionResult[])
    game.set('reveal', true)
    game.set('command', 'revealing')
  }, [])
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEAD-TO-HEAD MODE
// ═══════════════════════════════════════════════════════════════════════════════

/** Host calls this instead of useNextQuestion when gameMode === 'h2h' */
export function useNextH2HRound() {
  return useMutation(
    ({ storage }, { requesterId }: { requesterId: string }) => {
      const game = getGame(storage)
      if (!game) return

      const hostId = game.get('hostId') as string
      const bossId = game.get('bossId') as string
      if (requesterId !== hostId && requesterId !== bossId) return

      const command = game.get('command') as string
      if (command !== 'question' && command !== 'next') return

      const h2hPairs = (game.get('h2hPairs') as unknown as H2HPair[]) || []
      const currentIndex = ((game.get('currentQuestionIndex') as number) ?? -1) + 1

      if (currentIndex >= h2hPairs.length) {
        game.set('command', 'finished')
        return
      }

      const pair = h2hPairs[currentIndex]
      const sequence = (game.get('questionSequence') as unknown as Question[]) || []
      const anchor = sequence[currentIndex] ?? pair.left

      game.set('currentQuestion', anchor as unknown as Question)
      game.set('currentQuestionIndex', currentIndex)
      game.set('h2hCurrentPair', pair as unknown as H2HPair)
      game.set('questionStartsAt', new Date().toISOString())
      game.set('answers', {} as unknown as Record<string, string>)
      game.set('answeredAt', {} as unknown as Record<string, number>)
      game.set('hintsUsed', [] as unknown as string[])
      game.set('command', 'answering')
    },
    [],
  )
}

/** Reveals H2H answers — checks 'left' | 'right' against correctSide */
export function useRevealH2HAnswers() {
  return useMutation(({ storage }, requesterId: string) => {
    const game = getGame(storage)
    if (!game) return

    const hostId = game.get('hostId') as string
    const bossId = game.get('bossId') as string
    if (requesterId !== hostId && requesterId !== bossId) return

    const command = game.get('command') as string
    if (command !== 'answering') return

    const h2hCurrentPair = game.get('h2hCurrentPair') as unknown as H2HPair | null
    const currentQuestion = game.get('currentQuestion') as unknown as Question
    if (!h2hCurrentPair || !currentQuestion) return

    const answers = (game.get('answers') as unknown as Record<string, string>) || {}
    const answeredAt = (game.get('answeredAt') as unknown as Record<string, number>) || {}
    const players = getPlayers(game)

    const historyEntry: QuestionResult = {
      question: currentQuestion,
      playerAnswers: {},
    }

    players.forEach((player, index) => {
      const answer = answers[player.id] || ''
      const correct = answer === h2hCurrentPair.correctSide
      const elapsed = answeredAt[player.id] ?? SCORE_SPEED_WINDOW_MS
      const speedBonus = Math.round(
        H2H_SCORE_SPEED_MAX * Math.max(0, 1 - elapsed / SCORE_SPEED_WINDOW_MS),
      )
      const points = correct ? H2H_SCORE_CORRECT + speedBonus : 0

      historyEntry.playerAnswers[player.id] = { answer, points, correct }
      if (points > 0) {
        players.set(index, { ...player, score: player.score + points })
      }
    })

    const playedQuestions = getPlayedQuestions(game)
    playedQuestions.push(currentQuestion)

    const history = (game.get('questionHistory') as unknown as QuestionResult[]) || []
    game.set('questionHistory', [...history, historyEntry] as unknown as QuestionResult[])
    game.set('reveal', true)
    game.set('command', 'revealing')
  }, [])
}

// ═══════════════════════════════════════════════════════════════════════════════
// HIGHER / LOWER MODE
// ═══════════════════════════════════════════════════════════════════════════════

/** Host calls this instead of useNextQuestion when gameMode === 'higher-lower' */
export function useNextHLRound() {
  return useMutation(
    ({ storage }, { requesterId }: { requesterId: string }) => {
      const game = getGame(storage)
      if (!game) return

      const hostId = game.get('hostId') as string
      const bossId = game.get('bossId') as string
      if (requesterId !== hostId && requesterId !== bossId) return

      const command = game.get('command') as string
      if (command !== 'question' && command !== 'next') return

      const hlPairs = (game.get('hlPairs') as unknown as HLPair[]) || []
      const currentIndex = ((game.get('currentQuestionIndex') as number) ?? -1) + 1

      if (currentIndex >= hlPairs.length) {
        game.set('command', 'finished')
        return
      }

      const pair = hlPairs[currentIndex]
      const sequence = (game.get('questionSequence') as unknown as Question[]) || []
      const anchor = sequence[currentIndex] ?? pair.challenge

      game.set('currentQuestion', anchor as unknown as Question)
      game.set('currentQuestionIndex', currentIndex)
      game.set('hlCurrentPair', pair as unknown as HLPair)
      game.set('questionStartsAt', new Date().toISOString())
      game.set('answers', {} as unknown as Record<string, string>)
      game.set('answeredAt', {} as unknown as Record<string, number>)
      game.set('hintsUsed', [] as unknown as string[])
      game.set('command', 'answering')
    },
    [],
  )
}

/** Reveals HL answers — checks 'higher' | 'lower' against correctAnswer */
export function useRevealHLAnswers() {
  return useMutation(({ storage }, requesterId: string) => {
    const game = getGame(storage)
    if (!game) return

    const hostId = game.get('hostId') as string
    const bossId = game.get('bossId') as string
    if (requesterId !== hostId && requesterId !== bossId) return

    const command = game.get('command') as string
    if (command !== 'answering') return

    const hlCurrentPair = game.get('hlCurrentPair') as unknown as HLPair | null
    const currentQuestion = game.get('currentQuestion') as unknown as Question
    if (!hlCurrentPair || !currentQuestion) return

    const answers = (game.get('answers') as unknown as Record<string, string>) || {}
    const answeredAt = (game.get('answeredAt') as unknown as Record<string, number>) || {}
    const players = getPlayers(game)

    const historyEntry: QuestionResult = {
      question: currentQuestion,
      playerAnswers: {},
    }

    players.forEach((player, index) => {
      const answer = answers[player.id] || ''
      const correct = answer === hlCurrentPair.correctAnswer
      const elapsed = answeredAt[player.id] ?? SCORE_SPEED_WINDOW_MS
      const speedBonus = Math.round(
        HL_SCORE_SPEED_MAX * Math.max(0, 1 - elapsed / SCORE_SPEED_WINDOW_MS),
      )
      const points = correct ? HL_SCORE_CORRECT + speedBonus : 0

      historyEntry.playerAnswers[player.id] = { answer, points, correct }
      if (points > 0) {
        players.set(index, { ...player, score: player.score + points })
      }
    })

    const playedQuestions = getPlayedQuestions(game)
    playedQuestions.push(currentQuestion)

    const history = (game.get('questionHistory') as unknown as QuestionResult[]) || []
    game.set('questionHistory', [...history, historyEntry] as unknown as QuestionResult[])
    game.set('reveal', true)
    game.set('command', 'revealing')
  }, [])
}
