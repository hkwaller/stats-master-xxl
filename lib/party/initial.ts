import type { GameState } from '../../types/game'

export function createInitialGameState(
  roomId: string,
  hostId: string,
  bossToken: string,
): GameState {
  return {
    roomId,
    session: bossToken,
    hostId,
    bossId: '',
    bossToken,
    hostPlays: true,
    players: [],
    command: 'idle',
    pausedAt: '',
    countdownTime: 3,
    reveal: false,
    // Mode
    gameMode: 'classic',
    // Setup
    questionCount: 10,
    answerMode: 'multiplechoice',
    difficultyTiers: ['easy', 'medium'],
    revealMode: 'timed',
    hintsEnabled: true,
    powerupsEnabled: true,
    rookiesOnly: false,
    careerRevealOrder: 'chronological',
    careerMinSeasons: 5,
    careerMaxReveals: 8,
    careerShowYears: true,
    hlComparisonField: 'points',
    eras: [],
    // Classic sequence
    questionSequence: [],
    currentQuestion: null,
    currentQuestionIndex: -1,
    revealedColumns: 0,
    questionStartsAt: '',
    choices: [],
    answers: {},
    answeredAt: {},
    hintsUsed: [],
    playerPowerups: {},
    activePowerup: null,
    playerEliminatedChoices: {},
    freezeActive: false,
    playedQuestions: [],
    questionHistory: [],
    // Career mode
    careerData: [],
    careerSeasons: [],
    revealedSeasonCount: 0,
    careerPausedAt: '',
    careerPausedDurationMs: 0,
    buzzedInPlayerId: '',
    buzzedInSeasonCount: 0,
    lockedOutPlayers: [],
    careerPenaltyEndsAt: {},
    // H2H mode
    h2hPairs: [],
    h2hCurrentPair: null,
    // Higher/Lower mode
    hlPairs: [],
    hlCurrentPair: null,
  }
}
