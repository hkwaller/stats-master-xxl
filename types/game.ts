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

export type GameMode = 'classic' | 'career' | 'h2h' | 'higher-lower'
export type CareerRevealOrder = 'best-first' | 'worst-first' | 'chronological' | 'random'
export type HLComparisonField = 'goals' | 'assists' | 'points' | 'penaltyMinutes' | 'gamesPlayed'

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

// ─── Career Question (grouped player seasons) ─────────────────────────────────

export type CareerQuestion = {
  playerId: number
  firstName: string
  lastName: string
  totalCareerPoints: number
  seasons: Question[]  // ordered per careerRevealOrder setting
}

// ─── Head-to-Head Pair ────────────────────────────────────────────────────────

export type H2HPair = {
  left: Question
  right: Question
  targetName: string          // the name revealed to players ("Which is [targetName]?")
  correctSide: 'left' | 'right'
}

// ─── Higher/Lower Pair ────────────────────────────────────────────────────────

export type HLPair = {
  reference: Question
  challenge: Question
  field: HLComparisonField
  referenceValue: number
  challengeValue: number
  correctAnswer: 'higher' | 'lower'
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
  hostPlays: boolean    // whether the host also joins as a scoring player

  // Players — stored as LiveList<Player> in Liveblocks
  players: Player[]

  command: GameCommand
  countdownTime: number
  reveal: boolean

  // ─── Game Mode ─────────────────────────────────────────────────────────────
  gameMode: GameMode

  // ─── Setup configuration ───────────────────────────────────────────────────
  questionCount: number
  answerMode: AnswerMode
  difficultyTiers: DifficultyTier[]
  eras: string[]
  revealMode: RevealMode
  hintsEnabled: boolean
  powerupsEnabled: boolean

  // Classic extras
  rookiesOnly: boolean

  // Career setup
  careerRevealOrder: CareerRevealOrder
  careerMinSeasons: number
  careerMaxReveals: number

  // Higher/Lower setup
  hlComparisonField: HLComparisonField

  // ─── Classic / shared question sequence ───────────────────────────────────
  questionSequence: Question[]
  currentQuestion: Question | null
  currentQuestionIndex: number
  revealedColumns: number   // 0–5
  questionStartsAt: string  // ISO timestamp or ''

  // Multiple choice options (4 player name strings, shuffled)
  choices: string[]

  // Answers (simultaneous model — playerId → answer text)
  answers: Record<string, string>
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

  // ─── Career Mode ───────────────────────────────────────────────────────────
  careerData: CareerQuestion[]     // parallel to questionSequence (one entry per round)
  careerSeasons: Question[]        // current round's ordered seasons
  revealedSeasonCount: number      // how many seasons revealed so far this round
  buzzedInPlayerId: string         // '' if nobody has buzzed in
  buzzedInSeasonCount: number      // revealedSeasonCount at time of buzz-in (for scoring)
  lockedOutPlayers: string[]       // players who guessed wrong this round

  // ─── Head-to-Head Mode ────────────────────────────────────────────────────
  h2hPairs: H2HPair[]              // parallel to questionSequence
  h2hCurrentPair: H2HPair | null   // current round's pair

  // ─── Higher/Lower Mode ────────────────────────────────────────────────────
  hlPairs: HLPair[]                // parallel to questionSequence
  hlCurrentPair: HLPair | null     // current round's pair
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
  | 'gameMode'
  | 'questionCount'
  | 'answerMode'
  | 'difficultyTiers'
  | 'eras'
  | 'revealMode'
  | 'hintsEnabled'
  | 'powerupsEnabled'
  | 'rookiesOnly'
  | 'careerRevealOrder'
  | 'careerMinSeasons'
  | 'careerMaxReveals'
  | 'hlComparisonField'
  | 'hostPlays'
>

export const DEFAULT_SETUP: GameSetupConfig = {
  gameMode: 'classic',
  questionCount: 10,
  answerMode: 'multiplechoice',
  difficultyTiers: ['easy', 'medium'],
  eras: ['1970s', '1980s', '1990s', '2000s', '2010s', '2020s'],
  revealMode: 'instant',
  hintsEnabled: true,
  powerupsEnabled: true,
  rookiesOnly: false,
  careerRevealOrder: 'best-first',
  careerMinSeasons: 5,
  careerMaxReveals: 8,
  hlComparisonField: 'points',
  hostPlays: true,
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

// Base points by tier — harder questions earn more (Classic mode)
export const SCORE_BASE_BY_TIER: Record<DifficultyTier, number> = {
  easy:   80,
  medium: 100,
  hard:   130,
  expert: 160,
}
export const SCORE_SPEED_MAX = 50
export const SCORE_SPEED_WINDOW_MS = 40_000
export const SCORE_DOUBLEDOWN_WRONG = -50

// Career mode scoring tiers (based on fraction of seasons revealed when buzzing)
export const CAREER_SCORE_TIERS = {
  tier1: 150,  // first 25% of reveals
  tier2: 100,  // 25–50%
  tier3: 75,   // 50–75%
  tier4: 50,   // last 25%
}
export const CAREER_REVEAL_INTERVAL_MS = 8_000

// Head-to-Head scoring
export const H2H_SCORE_CORRECT = 100
export const H2H_SCORE_SPEED_MAX = 50

// Higher/Lower scoring
export const HL_SCORE_CORRECT = 75
export const HL_SCORE_SPEED_MAX = 25

// ─── Powerup initial charges ─────────────────────────────────────────────────

export const POWERUP_INITIAL_CHARGES: Record<PowerupType, number> = {
  eliminate: 1,
  doubledown: 1,
  freeze: 1,
  extrahint: 1,
}

// ─── Raw stats record shape (from nhl_player_seasons Supabase table) ─────────

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
