import { z } from 'zod'
import type { mutations } from './rules'
import type { GameState } from '../../types/game'

export type ActionType = keyof typeof mutations
export type ActionArgs<K extends ActionType> = Parameters<(typeof mutations)[K]>[1]
export type RoomAction = { [K in ActionType]: { type: K; args: ActionArgs<K> } }[ActionType]
export type RoomMessage = { type: 'state'; state: GameState; online: string[] }

const id = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/)
const text = z.string().max(200)
const mode = z.enum(['classic', 'career', 'h2h', 'higher-lower'])
const tier = z.enum(['easy', 'medium', 'hard', 'expert'])
const field = z.enum(['goals', 'assists', 'points', 'penaltyMinutes', 'gamesPlayed'])
const stat = z.number().finite().min(0).max(100_000)
const question = z.object({
  id: text,
  playerId: z.number().int().positive().max(1e10),
  firstName: text,
  lastName: text,
  seasonId: z.number().int().positive().max(1e10),
  season: text,
  era: text,
  positionCode: text,
  teamAbbrevs: text,
  teamNames: text,
  points: stat,
  gamesPlayed: stat,
  goals: stat,
  assists: stat,
  penaltyMinutes: stat,
  difficulty: tier,
  choices: z.array(text).max(4).optional(),
})
const career = z.object({
  playerId: z.number().int().positive().max(1e10),
  firstName: text,
  lastName: text,
  totalCareerPoints: stat,
  fullCareer: z.boolean().optional(),
  seasons: z.array(question).min(1).max(40),
})
const h2h = z.object({
  left: question,
  right: question,
  targetName: text,
  correctSide: z.enum(['left', 'right']),
})
const hl = z.object({
  reference: question,
  challenge: question,
  field,
  referenceValue: stat,
  challengeValue: stat,
  correctAnswer: z.enum(['higher', 'lower']),
})
const config = z.object({
  gameMode: mode,
  questionCount: z.number().int().min(1).max(50),
  answerMode: z.enum(['freetext', 'multiplechoice']),
  difficultyTiers: z.array(tier).min(1).max(4),
  eras: z.array(z.string().regex(/^\d{3}0s$/)).max(20),
  revealMode: z.enum(['timed', 'instant']),
  hintsEnabled: z.boolean(),
  powerupsEnabled: z.boolean(),
  rookiesOnly: z.boolean(),
  careerRevealOrder: z.enum(['best-first', 'worst-first', 'chronological', 'random']),
  careerMinSeasons: z.number().int().min(1).max(40),
  careerMaxReveals: z.number().int().min(1).max(40),
  careerShowYears: z.boolean(),
  hlComparisonField: field,
  hostPlays: z.boolean(),
})
const requester = z.object({ requesterId: id })
const player = z.object({ playerId: id })
const answer = player.extend({ answer: text })
const schemas = {
  joinGame: z.object({ id, name: z.string().trim().min(1).max(40) }),
  claimBoss: player.extend({ token: z.string().min(1).max(128) }),
  assignBoss: requester.extend({ playerId: id.nullable() }),
  saveSettings: requester.extend({ config }),
  startGame: requester.extend({
    questionSequence: z.array(question).min(1).max(50),
    bossToken: z.string().min(1).max(128),
    gameMode: mode.optional(),
    careerData: z.array(career).max(50).optional(),
    h2hPairs: z.array(h2h).max(50).optional(),
    hlPairs: z.array(hl).max(50).optional(),
  }),
  setGamePaused: requester.extend({ paused: z.boolean() }),
  tickCountdown: id,
  nextQuestion: requester.extend({ choices: z.array(text).max(4) }),
  revealNextColumn: id,
  submitAnswer: answer,
  revealAnswers: id,
  advanceToNext: id,
  skipQuestion: id,
  requestHint: z.object({ hintType: z.enum(['era', 'team', 'position']) }),
  activatePowerup: player.extend({
    powerupType: z.enum(['eliminate', 'doubledown', 'freeze', 'extrahint']),
  }),
  finishGame: id,
  rematch: id,
  refreshCareerData: requester.extend({ careers: z.array(career).max(50) }),
  nextCareerRound: requester,
  revealNextCareerSeason: id,
  buzzIn: player,
  cancelCareerBuzz: player,
  submitCareerAnswer: answer,
  revealCareerAnswer: id,
  nextH2HRound: requester,
  revealH2HAnswers: id,
  nextHLRound: requester,
  revealHLAnswers: id,
} satisfies Record<ActionType, z.ZodType>

/** Copy only validated fields from untrusted socket payloads. */
export function parseRoomAction(input: unknown): RoomAction | null {
  if (!input || typeof input !== 'object' || !('type' in input) || !('args' in input)) return null
  const { type, args } = input
  if (typeof type !== 'string' || !Object.hasOwn(schemas, type)) return null
  const result = schemas[type as ActionType].safeParse(args)
  return result.success ? ({ type, args: result.data } as RoomAction) : null
}
