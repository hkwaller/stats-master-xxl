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
} from '../../types/game'
import {
  CAREER_REVEAL_INTERVAL_MS,
  CAREER_PENALTY_MS,
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
} from '../../types/game'
import { getAvatarUrl } from '../avatar'
import { questionPausedAt, resumedTiming } from '../game/room-clock'
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
  difficulty: import('../../types/game').DifficultyTier,
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
function resumeCareerClock(game: GameState) {
  const pausedAt = game.careerPausedAt as string | undefined
  const pausedDuration = (game.careerPausedDurationMs as number) ?? 0
  const answeringTime = pausedAt ? Math.max(0, Date.now() - new Date(pausedAt).getTime()) : 0
  game.careerPausedDurationMs = pausedDuration + answeringTime
  game.careerPausedAt = ''
}

function joinGame(
  game: GameState,
  {
    id,
    name,
  }: {
    id: string
    name: string
  },
) {
  if (!game) return
  const players = game.players
  let alreadyJoined = false
  players.forEach((p) => {
    if (p.id === id) alreadyJoined = true
  })
  if (alreadyJoined) return
  const hostId = game.hostId as string
  const isHost = hostId === '' || hostId === id
  if (hostId === '') {
    game.hostId = id
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
}

function claimBoss(
  game: GameState,
  {
    playerId,
    token,
  }: {
    playerId: string
    token: string
  },
) {
  if (!game) return
  const storedToken = game.bossToken as string
  if (!storedToken || storedToken !== token) return
  game.bossId = playerId
  const players = game.players
  players.forEach((p, i) => {
    if (p.id === playerId) {
      players[i] = { ...p, isBoss: true }
    } else if (p.isBoss) {
      players[i] = { ...p, isBoss: false }
    }
  })
}

function assignBoss(
  game: GameState,
  {
    requesterId,
    playerId,
  }: {
    requesterId: string
    playerId: string | null
  },
) {
  if (!game) return
  const hostId = game.hostId as string
  if (requesterId !== hostId) return
  game.bossId = playerId ?? ''
  const players = game.players
  players.forEach((p, i) => {
    const shouldBeBoss = playerId !== null && p.id === playerId
    if (p.isBoss !== shouldBeBoss) {
      players[i] = { ...p, isBoss: shouldBeBoss }
    }
  })
}

function saveSettings(
  game: GameState,
  {
    config,
    requesterId,
  }: {
    config: GameSetupConfig
    requesterId: string
  },
) {
  if (!game) return
  const hostId = game.hostId as string
  const bossId = game.bossId as string
  if (requesterId !== hostId && requesterId !== bossId) return
  game.gameMode = config.gameMode as unknown as GameMode
  game.questionCount = config.questionCount
  game.answerMode = config.gameMode === 'career' ? 'freetext' : config.answerMode
  game.difficultyTiers = config.difficultyTiers as unknown as DifficultyTier[]
  game.eras = config.eras as unknown as string[]
  game.revealMode = config.revealMode
  game.hintsEnabled = config.hintsEnabled
  game.powerupsEnabled = config.gameMode === 'classic' && config.powerupsEnabled
  game.rookiesOnly = config.rookiesOnly
  game.careerRevealOrder =
    config.careerRevealOrder as unknown as import('../../types/game').CareerRevealOrder
  game.careerMinSeasons = config.careerMinSeasons
  game.careerMaxReveals = config.careerMaxReveals
  game.careerShowYears = config.careerShowYears !== false
  game.hlComparisonField =
    config.hlComparisonField as unknown as import('../../types/game').HLComparisonField
  game.hostPlays = config.hostPlays
}

function startGame(
  game: GameState,
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
) {
  if (!game) return
  const hostId = game.hostId as string
  const bossId = game.bossId as string
  if (requesterId !== hostId && requesterId !== bossId) return
  const powerupsEnabled = game.powerupsEnabled as boolean
  // Initialize powerups for each player
  const players = game.players
  const playerPowerups: Record<string, Record<string, number>> = {}
  if (powerupsEnabled) {
    players.forEach((p) => {
      playerPowerups[p.id] = { ...POWERUP_INITIAL_CHARGES }
    })
  }
  game.questionSequence = questionSequence as unknown as Question[]
  game.currentQuestionIndex = -1
  game.pausedAt = ''
  game.command = 'starting'
  game.countdownTime = 3
  game.bossToken = bossToken
  game.playerPowerups = playerPowerups as unknown as Record<string, Record<string, number>>
  game.playedQuestions = [] as unknown as Question[]
  game.reveal = false
  if (gameMode) game.gameMode = gameMode as unknown as GameMode
  // Store mode-specific data
  game.careerData = (careerData ?? []) as unknown as CareerQuestion[]
  game.h2hPairs = (h2hPairs ?? []) as unknown as H2HPair[]
  game.hlPairs = (hlPairs ?? []) as unknown as HLPair[]
  // Reset per-round state
  game.careerSeasons = [] as unknown as Question[]
  game.careerPausedAt = ''
  game.careerPausedDurationMs = 0
  game.revealedSeasonCount = 0
  game.buzzedInPlayerId = ''
  game.buzzedInSeasonCount = 0
  game.lockedOutPlayers = [] as unknown as string[]
  game.careerPenaltyEndsAt = {}
  game.h2hCurrentPair = null
  game.hlCurrentPair = null
  game.questionHistory = [] as unknown as QuestionResult[]
}

function setGamePaused(
  game: GameState,
  {
    requesterId,
    paused,
  }: {
    requesterId: string
    paused: boolean
  },
) {
  if (!game || !requesterId) return
  if (requesterId !== game.hostId && requesterId !== game.bossId) return
  if (game.command !== 'answering' && game.command !== 'starting') return
  const pausedAt = game.pausedAt
  if (paused === Boolean(pausedAt)) return
  if (paused) {
    game.pausedAt = new Date(Date.now()).toISOString()
  } else {
    Object.assign(
      game,
      resumedTiming(
        {
          pausedAt,
          questionStartsAt: game.questionStartsAt,
          careerPausedAt: game.careerPausedAt,
          careerPenaltyEndsAt: game.careerPenaltyEndsAt,
        },
        Date.now(),
      ),
    )
  }
}

function tickCountdown(game: GameState, requesterId: string) {
  if (!game || game.pausedAt) return
  const hostId = game.hostId as string
  if (requesterId !== hostId) return
  const current = (game.countdownTime as number) ?? 0
  if (current <= 1) {
    game.countdownTime = 0
    game.command = 'question'
  } else {
    game.countdownTime = current - 1
  }
}

function nextQuestion(
  game: GameState,
  {
    requesterId,
    choices,
  }: {
    requesterId: string
    choices: string[]
  },
) {
  if (!game || game.pausedAt) return
  const hostId = game.hostId as string
  const bossId = game.bossId as string
  if (requesterId !== hostId && requesterId !== bossId) return
  const command = game.command as string
  if (command !== 'question' && command !== 'next' && command !== 'starting') return
  const sequence = (game.questionSequence as unknown as Question[]) || []
  const currentIndex = ((game.currentQuestionIndex as number) ?? -1) + 1
  if (currentIndex >= sequence.length) {
    game.command = 'finished'
    return
  }
  const question = sequence[currentIndex]
  game.currentQuestion = question as unknown as Question
  game.currentQuestionIndex = currentIndex
  game.revealedColumns = 5
  game.questionStartsAt = new Date().toISOString()
  game.choices = choices as unknown as string[]
  game.answers = {} as unknown as Record<string, string>
  game.answeredAt = {} as unknown as Record<string, number>
  game.hintsUsed = [] as unknown as string[]
  game.playerEliminatedChoices = {} as unknown as Record<string, string[]>
  game.freezeActive = false
  game.activePowerup = null
  game.command = 'answering'
}

function revealNextColumn(game: GameState, requesterId: string) {
  if (!game || game.pausedAt) return
  const hostId = game.hostId as string
  if (requesterId !== hostId) return
  const freezeActive = game.freezeActive as boolean
  if (freezeActive) return
  const current = (game.revealedColumns as number) ?? 0
  if (current < 5) {
    game.revealedColumns = current + 1
  }
}

function submitAnswer(
  game: GameState,
  {
    playerId,
    answer,
  }: {
    playerId: string
    answer: string
  },
) {
  if (!game || game.pausedAt) return
  const command = game.command as string
  if (command !== 'answering') return
  const existingAnswers = (game.answers as unknown as Record<string, string>) || {}
  if (existingAnswers[playerId] !== undefined) return
  const questionStartsAt = game.questionStartsAt as string
  const startTime = questionStartsAt ? new Date(questionStartsAt).getTime() : Date.now()
  const elapsedMs = Date.now() - startTime
  const newAnswers = { ...existingAnswers, [playerId]: answer }
  game.answers = newAnswers as unknown as Record<string, string>
  const existingAnsweredAt = (game.answeredAt as unknown as Record<string, number>) || {}
  game.answeredAt = {
    ...existingAnsweredAt,
    [playerId]: elapsedMs,
  } as unknown as Record<string, number>
}

function revealAnswers(game: GameState, requesterId: string) {
  if (!game || game.pausedAt) return
  const hostId = game.hostId as string
  const bossId = game.bossId as string
  if (requesterId !== hostId && requesterId !== bossId) return
  const command = game.command as string
  if (command !== 'answering') return
  const currentQuestion = game.currentQuestion as unknown as Question
  if (!currentQuestion) return
  const answers = (game.answers as unknown as Record<string, string>) || {}
  const answeredAt = (game.answeredAt as unknown as Record<string, number>) || {}
  const playerPowerups =
    (game.playerPowerups as unknown as Record<string, Record<string, number>>) || {}
  const players = game.players
  const historyEntry: QuestionResult = {
    question: currentQuestion,
    playerAnswers: {},
  }
  players.forEach((player, index) => {
    const answer = answers[player.id] || ''
    const elapsed = answeredAt[player.id] ?? SCORE_SPEED_WINDOW_MS
    const usedDoubleDown =
      (playerPowerups[player.id]?.doubledown ?? POWERUP_INITIAL_CHARGES.doubledown) === 0
    const correct = isCorrectAnswer(answer, currentQuestion)
    const points = calcScore(elapsed, currentQuestion.difficulty, usedDoubleDown, correct)
    historyEntry.playerAnswers[player.id] = { answer, points, correct }
    if (points !== 0) {
      players[index] = { ...player, score: player.score + points }
    }
  })
  const playedQuestions = game.playedQuestions
  playedQuestions.push(currentQuestion)
  const history = (game.questionHistory as unknown as QuestionResult[]) || []
  game.questionHistory = [...history, historyEntry] as unknown as QuestionResult[]
  game.reveal = true
  game.command = 'revealing'
}

function advanceToNext(game: GameState, requesterId: string) {
  if (!game || game.pausedAt) return
  const hostId = game.hostId as string
  const bossId = game.bossId as string
  if (requesterId !== hostId && requesterId !== bossId) return
  const currentIndex = (game.currentQuestionIndex as number) ?? 0
  const sequence = (game.questionSequence as unknown as Question[]) || []
  const questionCount = (game.questionCount as number) ?? sequence.length
  game.reveal = false
  if (currentIndex + 1 >= Math.min(questionCount, sequence.length)) {
    game.command = 'finished'
  } else {
    game.command = 'next'
  }
}

function skipQuestion(game: GameState, requesterId: string) {
  if (!game || game.pausedAt) return
  const hostId = game.hostId as string
  const bossId = game.bossId as string
  if (requesterId !== hostId && requesterId !== bossId) return
  const command = game.command as string
  if (command !== 'answering') return
  const currentIndex = (game.currentQuestionIndex as number) ?? 0
  const sequence = (game.questionSequence as unknown as Question[]) || []
  const questionCount = (game.questionCount as number) ?? sequence.length
  if (currentIndex + 1 >= Math.min(questionCount, sequence.length)) {
    game.command = 'finished'
  } else {
    game.command = 'next'
  }
}

function requestHint(
  game: GameState,
  {
    hintType,
  }: {
    hintType: string
  },
) {
  if (!game || game.pausedAt) return
  const hintsEnabled = game.hintsEnabled as boolean
  if (!hintsEnabled) return
  if (hintType === 'era' && game.gameMode === 'career' && game.careerShowYears !== false) return
  const hintsUsed = (game.hintsUsed as unknown as string[]) || []
  if (hintsUsed.includes(hintType)) return
  game.hintsUsed = [...hintsUsed, hintType] as unknown as string[]
}

function activatePowerup(
  game: GameState,
  {
    playerId,
    powerupType,
  }: {
    playerId: string
    powerupType: PowerupType
  },
) {
  if (!game || game.pausedAt) return
  const powerupsEnabled = game.powerupsEnabled as boolean
  if (!powerupsEnabled) return
  const command = game.command as string
  if (command !== 'answering') return
  const playerPowerups =
    (game.playerPowerups as unknown as Record<string, Record<string, number>>) || {}
  const charges = playerPowerups[playerId]?.[powerupType] ?? 0
  if (charges <= 0) return
  const answerMode = game.answerMode as string
  const revealMode = game.revealMode as string
  const gameMode = game.gameMode as string
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
  game.playerPowerups = updatedPowerups as unknown as Record<string, Record<string, number>>
  game.activePowerup = { type: powerupType, playerId } as unknown as {
    type: PowerupType
    playerId: string
  }
  switch (powerupType) {
    case 'freeze':
      game.freezeActive = true
      break
    case 'extrahint': {
      const current = (game.revealedColumns as number) ?? 0
      if (current < 5) game.revealedColumns = current + 1
      break
    }
    case 'eliminate': {
      const choices = (game.choices as unknown as string[]) || []
      const currentQuestion = game.currentQuestion as unknown as Question
      if (!currentQuestion) break
      const correctName = `${currentQuestion.firstName} ${currentQuestion.lastName}`
      const wrongChoices = choices.filter((c) => c !== correctName)
      const toEliminate = wrongChoices.sort(() => Math.random() - 0.5).slice(0, 2)
      const existing = (game.playerEliminatedChoices as unknown as Record<string, string[]>) || {}
      game.playerEliminatedChoices = {
        ...existing,
        [playerId]: toEliminate,
      } as unknown as Record<string, string[]>
      break
    }
  }
}

function finishGame(game: GameState, requesterId: string) {
  if (!game) return
  const hostId = game.hostId as string
  const bossId = game.bossId as string
  if (requesterId !== hostId && requesterId !== bossId) return
  game.command = 'finished'
}

function rematch(game: GameState, requesterId: string) {
  if (!game) return
  const hostId = game.hostId as string
  const bossId = game.bossId as string
  if (requesterId !== hostId && requesterId !== bossId) return
  const players = game.players
  players.forEach((p, i) => {
    players[i] = { ...p, score: 0 }
  })
  game.pausedAt = ''
  game.command = 'rematch'
  game.session = `${(game.session ?? 'room').split(':')[0]}:${Number((game.session ?? 'room').split(':')[1] ?? 0) + 1}`
  game.currentQuestion = null
  game.currentQuestionIndex = -1
  game.questionSequence = [] as unknown as Question[]
  game.playedQuestions = [] as unknown as Question[]
  game.answers = {} as unknown as Record<string, string>
  game.answeredAt = {} as unknown as Record<string, number>
  game.hintsUsed = [] as unknown as string[]
  game.playerPowerups = {} as unknown as Record<string, Record<string, number>>
  game.playerEliminatedChoices = {} as unknown as Record<string, string[]>
  game.freezeActive = false
  game.activePowerup = null
  game.reveal = false
  game.revealedColumns = 0
  game.questionHistory = [] as unknown as QuestionResult[]
  // Mode-specific sequences
  game.careerData = [] as unknown as CareerQuestion[]
  game.h2hPairs = [] as unknown as H2HPair[]
  game.hlPairs = [] as unknown as HLPair[]
  game.careerSeasons = [] as unknown as Question[]
  game.careerPausedAt = ''
  game.careerPausedDurationMs = 0
  game.revealedSeasonCount = 0
  game.buzzedInPlayerId = ''
  game.buzzedInSeasonCount = 0
  game.lockedOutPlayers = [] as unknown as string[]
  game.careerPenaltyEndsAt = {}
  game.h2hCurrentPair = null
  game.hlCurrentPair = null
}

function refreshCareerData(
  game: GameState,
  {
    requesterId,
    careers,
  }: {
    requesterId: string
    careers: CareerQuestion[]
  },
) {
  if (!game || game.hostId !== requesterId || game.gameMode !== 'career') return
  const existing = (game.careerData as unknown as CareerQuestion[]) ?? []
  const refreshed = new Map(
    careers.filter((c) => c.fullCareer && c.seasons.length).map((c) => [c.playerId, c]),
  )
  const data = existing.map((c) => refreshed.get(c.playerId) ?? c)
  game.careerData = data
  const current = data[(game.currentQuestionIndex as number) ?? -1]
  if (!current || !refreshed.has(current.playerId)) return
  game.careerSeasons = current.seasons
  game.currentQuestion = current.seasons[0]
  // Preserve the round's elapsed time and scoring history when restoring it.
  const pausedAt = questionPausedAt({
    gameMode: 'career',
    pausedAt: game.pausedAt,
    careerPausedAt: game.careerPausedAt,
  })
  const clockNow = pausedAt ? new Date(pausedAt).getTime() : Date.now()
  const elapsed =
    clockNow -
    new Date(game.questionStartsAt as string).getTime() -
    ((game.careerPausedDurationMs as number) ?? 0)
  game.revealedSeasonCount = Math.min(
    current.seasons.length,
    Math.max(1, Math.floor(elapsed / CAREER_REVEAL_INTERVAL_MS) + 1),
  )
}

function nextCareerRound(
  game: GameState,
  {
    requesterId,
  }: {
    requesterId: string
  },
) {
  if (!game || game.pausedAt) return
  const hostId = game.hostId as string
  const bossId = game.bossId as string
  if (requesterId !== hostId && requesterId !== bossId) return
  const command = game.command as string
  if (command !== 'question' && command !== 'next') return
  const careerData = (game.careerData as unknown as CareerQuestion[]) || []
  const currentIndex = ((game.currentQuestionIndex as number) ?? -1) + 1
  if (currentIndex >= careerData.length) {
    game.command = 'finished'
    return
  }
  const career = careerData[currentIndex]
  const seasons = [...career.seasons].sort((a, b) => a.seasonId - b.seasonId)
  // Use the first season as anchor (has the player's name for scoring)
  const anchor = seasons[0]
  game.currentQuestion = anchor as unknown as Question
  game.currentQuestionIndex = currentIndex
  game.careerSeasons = seasons as unknown as Question[]
  game.careerPausedAt = ''
  game.careerPausedDurationMs = 0
  game.revealedSeasonCount = 1 // reveal first season immediately
  game.buzzedInPlayerId = ''
  game.buzzedInSeasonCount = 0
  game.lockedOutPlayers = [] as unknown as string[]
  game.careerPenaltyEndsAt = {}
  game.answers = {} as unknown as Record<string, string>
  game.answeredAt = {} as unknown as Record<string, number>
  game.hintsUsed = [] as unknown as string[]
  game.questionStartsAt = new Date().toISOString()
  game.command = 'answering'
}

function revealNextCareerSeason(game: GameState, requesterId: string) {
  if (!game || game.pausedAt) return
  const hostId = game.hostId as string
  if (requesterId !== hostId) return
  const command = game.command as string
  if (command !== 'answering') return
  const gameMode = game.gameMode as string
  if (gameMode !== 'career') return
  if (game.buzzedInPlayerId) return // answering owns the board until submission
  const careerSeasons = (game.careerSeasons as unknown as Question[]) || []
  const current = (game.revealedSeasonCount as number) ?? 0
  if (current < careerSeasons.length) {
    game.revealedSeasonCount = current + 1
  }
}

function buzzIn(
  game: GameState,
  {
    playerId,
  }: {
    playerId: string
  },
) {
  if (!game || game.pausedAt) return
  const command = game.command as string
  if (command !== 'answering') return
  const gameMode = game.gameMode as string
  if (gameMode !== 'career') return
  const buzzedInPlayerId = game.buzzedInPlayerId as string
  if (buzzedInPlayerId) return // already someone buzzing
  const penalties = game.careerPenaltyEndsAt ?? {}
  if ((penalties[playerId] ?? 0) > Date.now()) return
  const revealedSeasonCount = (game.revealedSeasonCount as number) ?? 0
  game.careerPausedAt = new Date(Date.now()).toISOString()
  game.buzzedInPlayerId = playerId
  game.buzzedInSeasonCount = revealedSeasonCount
}

function cancelCareerBuzz(
  game: GameState,
  {
    playerId,
  }: {
    playerId: string
  },
) {
  if (!game || game.pausedAt || game.gameMode !== 'career' || game.command !== 'answering') return
  if (!playerId || game.buzzedInPlayerId !== playerId) return
  resumeCareerClock(game)
  game.buzzedInPlayerId = ''
  game.buzzedInSeasonCount = 0
}

function submitCareerAnswer(
  game: GameState,
  {
    playerId,
    answer,
  }: {
    playerId: string
    answer: string
  },
) {
  if (!game || game.pausedAt) return
  const command = game.command as string
  if (command !== 'answering') return
  const buzzedInPlayerId = game.buzzedInPlayerId as string
  if (buzzedInPlayerId !== playerId) return // not their turn
  const currentQuestion = game.currentQuestion as unknown as Question
  if (!currentQuestion) return
  resumeCareerClock(game)
  const correct = isCorrectAnswer(answer, currentQuestion)
  const existingAnswers = (game.answers as unknown as Record<string, string>) ?? {}
  const recordedAnswers = { ...existingAnswers, [playerId]: answer }
  game.answers = recordedAnswers
  if (correct) {
    const careerSeasons = (game.careerSeasons as unknown as Question[]) || []
    const buzzedAt = (game.buzzedInSeasonCount as number) ?? 0
    const revealFraction = buzzedAt / Math.max(careerSeasons.length, 1)
    let points: number
    if (revealFraction <= 0.25) points = CAREER_SCORE_TIERS.tier1
    else if (revealFraction <= 0.5) points = CAREER_SCORE_TIERS.tier2
    else if (revealFraction <= 0.75) points = CAREER_SCORE_TIERS.tier3
    else points = CAREER_SCORE_TIERS.tier4
    const players = game.players
    const historyEntry: QuestionResult = {
      question: currentQuestion,
      playerAnswers: {},
    }
    players.forEach((player, index) => {
      const isWinner = player.id === playerId
      const pts = isWinner ? points : 0
      historyEntry.playerAnswers[player.id] = {
        answer: recordedAnswers[player.id] ?? '',
        points: pts,
        correct: isWinner,
      }
      if (pts > 0) {
        players[index] = { ...player, score: player.score + pts }
      }
    })
    const playedQuestions = game.playedQuestions
    playedQuestions.push(currentQuestion)
    const history = (game.questionHistory as unknown as QuestionResult[]) || []
    game.questionHistory = [...history, historyEntry] as unknown as QuestionResult[]
    game.reveal = true
    game.buzzedInPlayerId = ''
    game.command = 'revealing'
  } else {
    const penalties = game.careerPenaltyEndsAt ?? {}
    game.careerPenaltyEndsAt = { ...penalties, [playerId]: Date.now() + CAREER_PENALTY_MS }
    game.buzzedInPlayerId = ''
    game.buzzedInSeasonCount = 0
  }
}

function revealCareerAnswer(game: GameState, requesterId: string) {
  if (!game || game.pausedAt) return
  const hostId = game.hostId as string
  const bossId = game.bossId as string
  if (requesterId !== hostId && requesterId !== bossId) return
  const command = game.command as string
  if (command !== 'answering') return
  const gameMode = game.gameMode as string
  if (gameMode !== 'career') return
  if (game.buzzedInPlayerId) return // answering owns the board until submission
  const currentQuestion = game.currentQuestion as unknown as Question
  const players = game.players
  const answers = (game.answers as unknown as Record<string, string>) ?? {}
  const historyEntry: QuestionResult = {
    question: currentQuestion,
    playerAnswers: {},
  }
  players.forEach((player) => {
    historyEntry.playerAnswers[player.id] = {
      answer: answers[player.id] ?? '',
      points: 0,
      correct: false,
    }
  })
  const playedQuestions = game.playedQuestions
  if (currentQuestion) playedQuestions.push(currentQuestion)
  const history = (game.questionHistory as unknown as QuestionResult[]) || []
  game.questionHistory = [...history, historyEntry] as unknown as QuestionResult[]
  game.reveal = true
  game.command = 'revealing'
}

function nextH2HRound(
  game: GameState,
  {
    requesterId,
  }: {
    requesterId: string
  },
) {
  if (!game || game.pausedAt) return
  const hostId = game.hostId as string
  const bossId = game.bossId as string
  if (requesterId !== hostId && requesterId !== bossId) return
  const command = game.command as string
  if (command !== 'question' && command !== 'next') return
  const h2hPairs = (game.h2hPairs as unknown as H2HPair[]) || []
  const currentIndex = ((game.currentQuestionIndex as number) ?? -1) + 1
  if (currentIndex >= h2hPairs.length) {
    game.command = 'finished'
    return
  }
  const pair = h2hPairs[currentIndex]
  const sequence = (game.questionSequence as unknown as Question[]) || []
  const anchor = sequence[currentIndex] ?? pair.left
  game.currentQuestion = anchor as unknown as Question
  game.currentQuestionIndex = currentIndex
  game.h2hCurrentPair = pair as unknown as H2HPair
  game.questionStartsAt = new Date().toISOString()
  game.answers = {} as unknown as Record<string, string>
  game.answeredAt = {} as unknown as Record<string, number>
  game.hintsUsed = [] as unknown as string[]
  game.command = 'answering'
}

function revealH2HAnswers(game: GameState, requesterId: string) {
  if (!game || game.pausedAt) return
  const hostId = game.hostId as string
  const bossId = game.bossId as string
  if (requesterId !== hostId && requesterId !== bossId) return
  const command = game.command as string
  if (command !== 'answering') return
  const h2hCurrentPair = game.h2hCurrentPair as unknown as H2HPair | null
  const currentQuestion = game.currentQuestion as unknown as Question
  if (!h2hCurrentPair || !currentQuestion) return
  const answers = (game.answers as unknown as Record<string, string>) || {}
  const answeredAt = (game.answeredAt as unknown as Record<string, number>) || {}
  const players = game.players
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
      players[index] = { ...player, score: player.score + points }
    }
  })
  const playedQuestions = game.playedQuestions
  playedQuestions.push(currentQuestion)
  const history = (game.questionHistory as unknown as QuestionResult[]) || []
  game.questionHistory = [...history, historyEntry] as unknown as QuestionResult[]
  game.reveal = true
  game.command = 'revealing'
}

function nextHLRound(
  game: GameState,
  {
    requesterId,
  }: {
    requesterId: string
  },
) {
  if (!game || game.pausedAt) return
  const hostId = game.hostId as string
  const bossId = game.bossId as string
  if (requesterId !== hostId && requesterId !== bossId) return
  const command = game.command as string
  if (command !== 'question' && command !== 'next') return
  const hlPairs = (game.hlPairs as unknown as HLPair[]) || []
  const currentIndex = ((game.currentQuestionIndex as number) ?? -1) + 1
  if (currentIndex >= hlPairs.length) {
    game.command = 'finished'
    return
  }
  const pair = hlPairs[currentIndex]
  const sequence = (game.questionSequence as unknown as Question[]) || []
  const anchor = sequence[currentIndex] ?? pair.challenge
  game.currentQuestion = anchor as unknown as Question
  game.currentQuestionIndex = currentIndex
  game.hlCurrentPair = pair as unknown as HLPair
  game.questionStartsAt = new Date().toISOString()
  game.answers = {} as unknown as Record<string, string>
  game.answeredAt = {} as unknown as Record<string, number>
  game.hintsUsed = [] as unknown as string[]
  game.command = 'answering'
}

function revealHLAnswers(game: GameState, requesterId: string) {
  if (!game || game.pausedAt) return
  const hostId = game.hostId as string
  const bossId = game.bossId as string
  if (requesterId !== hostId && requesterId !== bossId) return
  const command = game.command as string
  if (command !== 'answering') return
  const hlCurrentPair = game.hlCurrentPair as unknown as HLPair | null
  const currentQuestion = game.currentQuestion as unknown as Question
  if (!hlCurrentPair || !currentQuestion) return
  const answers = (game.answers as unknown as Record<string, string>) || {}
  const answeredAt = (game.answeredAt as unknown as Record<string, number>) || {}
  const players = game.players
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
      players[index] = { ...player, score: player.score + points }
    }
  })
  const playedQuestions = game.playedQuestions
  playedQuestions.push(currentQuestion)
  const history = (game.questionHistory as unknown as QuestionResult[]) || []
  game.questionHistory = [...history, historyEntry] as unknown as QuestionResult[]
  game.reveal = true
  game.command = 'revealing'
}

export const mutations = {
  joinGame,
  claimBoss,
  assignBoss,
  saveSettings,
  startGame,
  setGamePaused,
  tickCountdown,
  nextQuestion,
  revealNextColumn,
  submitAnswer,
  revealAnswers,
  advanceToNext,
  skipQuestion,
  requestHint,
  activatePowerup,
  finishGame,
  rematch,
  refreshCareerData,
  nextCareerRound,
  revealNextCareerSeason,
  buzzIn,
  cancelCareerBuzz,
  submitCareerAnswer,
  revealCareerAnswer,
  nextH2HRound,
  revealH2HAnswers,
  nextHLRound,
  revealHLAnswers,
}
