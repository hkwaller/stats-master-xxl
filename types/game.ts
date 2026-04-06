// ─── Unions ──────────────────────────────────────────────────────────────────

export type GameCommand =
  | 'idle'
  | 'starting'
  | 'question'
  | 'answering'
  | 'revealing'
  | 'next'
  | 'finished'
  | 'rematch'

export type DifficultyTier = 'easy' | 'medium' | 'hard' | 'expert'
export type AnswerMode = 'freetext' | 'multiplechoice'
export type RevealMode = 'timed' | 'instant'
export type HintType = 'era' | 'team' | 'position'
export type PowerupType = 'eliminate' | 'doubledown' | 'freeze' | 'extrahint'

// ─── NHL Question ─────────────────────────────────────────────────────────────

export type Question = {
  id: string
  playerId: number
  firstName: string
  lastName: string
  seasonId: number
  season: string         // "1985-86"
  era: string            // "1980s"
  positionCode: string
  teamAbbrevs: string
  teamNames: string
  points: number
  gamesPlayed: number
  goals: number
  assists: number
  penaltyMinutes: number
  difficulty: DifficultyTier
  choices?: string[]  // pre-generated multiple choice options (embedded at question generation)
}

// ─── Player (room participant, not NHL player) ────────────────────────────────

export type Player = {
  id: string
  name: string
  avatarUrl: string
  score: number
  isHost: boolean
  isBoss: boolean
  isConnected: boolean
}

// ─── Game State (stored in Liveblocks under key "game") ───────────────────────

export type GameState = {
  roomId: string
  hostId: string
  bossId: string        // '' if no boss set
  bossToken: string     // random token for boss claim URL

  // Players — stored as LiveList<Player> in Liveblocks
  players: Player[]

  command: GameCommand
  countdownTime: number
  reveal: boolean

  // Setup configuration
  questionCount: number
  answerMode: AnswerMode
  difficultyTiers: DifficultyTier[]
  eras: string[]
  revealMode: RevealMode
  hintsEnabled: boolean
  powerupsEnabled: boolean

  // Question sequence — set once at game start, read-only after
  questionSequence: Question[]
  currentQuestion: Question | null
  currentQuestionIndex: number
  revealedColumns: number   // 0–5
  questionStartsAt: string  // ISO timestamp or ''

  // Multiple choice options (4 player name strings, shuffled)
  choices: string[]

  // Answers (simultaneous model)
  answers: Record<string, string>   // playerId → answer text
  answeredAt: Record<string, number> // playerId → elapsed ms from questionStartsAt

  // Hints revealed this round (shared across all players)
  hintsUsed: string[]  // HintType[]

  // Powerups
  playerPowerups: Record<string, Record<string, number>>  // playerId → PowerupType → charges
  activePowerup: { type: PowerupType; playerId: string } | null
  eliminatedChoices: string[]  // player names removed from choices
  freezeActive: boolean

  // Played questions (for history/rematch)
  playedQuestions: Question[]

  // Per-question results accumulated as each question is revealed
  questionHistory: QuestionResult[]
}

// ─── Question Result ─────────────────────────────────────────────────────────

export type QuestionResult = {
  question: Question
  playerAnswers: Record<string, { answer: string; points: number; correct: boolean }>
}

// ─── Liveblocks Presence ─────────────────────────────────────────────────────

export type UserPresence = {
  isConnected: boolean
  lastSeen: string  // ISO timestamp
}

// ─── Setup Config (subset used in the setup form) ────────────────────────────

export type GameSetupConfig = Pick<
  GameState,
  | 'questionCount'
  | 'answerMode'
  | 'difficultyTiers'
  | 'eras'
  | 'revealMode'
  | 'hintsEnabled'
  | 'powerupsEnabled'
>

export const DEFAULT_SETUP: GameSetupConfig = {
  questionCount: 10,
  answerMode: 'multiplechoice',
  difficultyTiers: ['easy', 'medium'],
  eras: ['1970s', '1980s', '1990s', '2000s', '2010s', '2020s'],
  revealMode: 'instant',
  hintsEnabled: true,
  powerupsEnabled: true,
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

// Base points by tier — harder questions earn more
export const SCORE_BASE_BY_TIER: Record<DifficultyTier, number> = {
  easy:   80,
  medium: 100,
  hard:   130,
  expert: 160,
}
export const SCORE_SPEED_MAX = 50
export const SCORE_SPEED_WINDOW_MS = 40_000
export const SCORE_DOUBLEDOWN_WRONG = -50

// ─── Powerup initial charges ─────────────────────────────────────────────────

export const POWERUP_INITIAL_CHARGES: Record<PowerupType, number> = {
  eliminate: 1,
  doubledown: 1,
  freeze: 1,
  extrahint: 1,
}

// ─── Raw stats record shape (from scores.js) ─────────────────────────────────

export type RawStatsRecord = {
  id: number
  playerId: number
  firstName: string
  lastName: string
  seasonId: number
  positionCode: string
  teamAbbrevs: string
  teamNames: string
  gamesPlayed: number
  goals: number
  assists: number
  points: number
  penaltyMinutes: number
  activePlayer: boolean
  rookieFlag: boolean
  [key: string]: unknown
}
