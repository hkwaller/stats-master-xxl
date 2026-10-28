import { describe, expect, it, vi } from 'vitest'
import { createInitialGameState } from './initial'
import { applyRoomAction } from './reducer'
import { parseRoomAction, type RoomAction } from './protocol'
import { DEFAULT_SETUP, type GameMode, type GameState, type Question } from '../../types/game'

const online = new Set(['host', 'boss', 'alice', 'bob', 'stranger'])
const q: Question = {
  id: 'q1',
  playerId: 8471675,
  firstName: 'Sidney',
  lastName: 'Crosby',
  seasonId: 20242025,
  season: '2024-25',
  era: '2020s',
  positionCode: 'C',
  teamAbbrevs: 'PIT',
  teamNames: 'Pittsburgh Penguins',
  points: 100,
  gamesPlayed: 80,
  goals: 40,
  assists: 60,
  penaltyMinutes: 30,
  difficulty: 'hard',
  choices: ['Sidney Crosby', 'Wayne Gretzky', 'Mario Lemieux', 'Paul Coffey'],
}
function apply(s: GameState, me: string, a: RoomAction) {
  return applyRoomAction(s, me, online, a)
}
function room() {
  let s = createInitialGameState('ABC123', 'host', 'boss-token')
  for (const id of ['host', 'boss', 'alice', 'bob'])
    s = apply(s, id, { type: 'joinGame', args: { id, name: id } })
  return apply(s, 'host', { type: 'assignBoss', args: { requesterId: 'host', playerId: 'boss' } })
}
function start(mode: GameMode) {
  let s = room()
  s = apply(s, 'host', {
    type: 'saveSettings',
    args: { requesterId: 'host', config: { ...DEFAULT_SETUP, gameMode: mode, questionCount: 2 } },
  })
  const action: RoomAction = {
    type: 'startGame',
    args: {
      requesterId: 'host',
      bossToken: 'token',
      gameMode: mode,
      questionSequence: [q, { ...q, id: 'q2' }],
      careerData:
        mode === 'career'
          ? [1, 2].map(() => ({
              playerId: q.playerId,
              firstName: q.firstName,
              lastName: q.lastName,
              totalCareerPoints: 1000,
              fullCareer: true,
              seasons: Array.from({ length: 8 }, (_, i) => ({
                ...q,
                seasonId: 20102011 + i * 10001,
              })),
            }))
          : [],
      h2hPairs:
        mode === 'h2h'
          ? [1, 2].map(() => ({
              left: q,
              right: q,
              targetName: 'Sidney Crosby',
              correctSide: 'left' as const,
            }))
          : [],
      hlPairs:
        mode === 'higher-lower'
          ? [1, 2].map(() => ({
              reference: q,
              challenge: q,
              field: 'points' as const,
              referenceValue: 90,
              challengeValue: 100,
              correctAnswer: 'higher' as const,
            }))
          : [],
    },
  }
  expect(parseRoomAction(action)).toEqual(action)
  s = apply(s, 'host', action)
  expect(s.command).toBe('starting')
  for (let i = 0; i < 3; i++) s = apply(s, 'host', { type: 'tickCountdown', args: 'host' })
  expect(s.command).toBe('question')
  return s
}
function next(s: GameState) {
  const type = {
    classic: 'nextQuestion',
    career: 'nextCareerRound',
    h2h: 'nextH2HRound',
    'higher-lower': 'nextHLRound',
  }[s.gameMode]
  return apply(s, 'host', {
    type,
    args: { requesterId: 'host', choices: q.choices! },
  } as RoomAction)
}

describe('full multiplayer games', () => {
  for (const mode of ['classic', 'career', 'h2h', 'higher-lower'] as const)
    it(`${mode}: countdown, two rounds, scores, finish and rematch`, () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-10-28T12:00:00Z'))
      try {
        let s = start(mode)
        const original = s
        for (let i = 0; i < 2; i++) {
          s = next(s)
          expect(s.currentQuestionIndex).toBe(i)
          expect(s.command).toBe('answering')
          const paused = apply(s, 'boss', {
            type: 'setGamePaused',
            args: { requesterId: 'boss', paused: true },
          })
          expect(
            apply(paused, 'alice', {
              type: 'submitAnswer',
              args: { playerId: 'alice', answer: 'Crosby' },
            }),
          ).toBe(paused)
          vi.advanceTimersByTime(30_000)
          s = apply(paused, 'host', {
            type: 'setGamePaused',
            args: { requesterId: 'host', paused: false },
          })
          if (mode === 'career') {
            s = apply(s, 'alice', { type: 'buzzIn', args: { playerId: 'alice' } })
            expect(apply(s, 'bob', { type: 'buzzIn', args: { playerId: 'bob' } })).toBe(s)
            s = apply(s, 'alice', {
              type: 'submitCareerAnswer',
              args: { playerId: 'alice', answer: 'Wrong' },
            })
            expect(s.careerPenaltyEndsAt!.alice).toBe(Date.now() + 10_000)
            expect(apply(s, 'alice', { type: 'buzzIn', args: { playerId: 'alice' } })).toBe(s)
            s = apply(s, 'bob', { type: 'buzzIn', args: { playerId: 'bob' } })
            s = apply(s, 'bob', { type: 'cancelCareerBuzz', args: { playerId: 'bob' } })
            s = apply(s, 'bob', { type: 'buzzIn', args: { playerId: 'bob' } })
            s = apply(s, 'bob', {
              type: 'submitCareerAnswer',
              args: { playerId: 'bob', answer: 'Crosby' },
            })
          } else {
            const answer = mode === 'h2h' ? 'left' : mode === 'higher-lower' ? 'higher' : 'Crosby'
            s = apply(s, 'alice', { type: 'submitAnswer', args: { playerId: 'alice', answer } })
            expect(
              apply(s, 'alice', {
                type: 'submitAnswer',
                args: { playerId: 'alice', answer: 'Wrong' },
              }),
            ).toBe(s)
            s = apply(s, 'bob', {
              type: 'submitAnswer',
              args: { playerId: 'bob', answer: 'Wrong' },
            })
            const type =
              mode === 'h2h'
                ? 'revealH2HAnswers'
                : mode === 'higher-lower'
                  ? 'revealHLAnswers'
                  : 'revealAnswers'
            s = apply(s, 'boss', { type, args: 'boss' })
            expect(apply(s, 'boss', { type, args: 'boss' })).toBe(s)
          }
          expect(s.command).toBe('revealing')
          expect(s.questionHistory).toHaveLength(i + 1)
          const winner = s.players.find((p) => p.id === (mode === 'career' ? 'bob' : 'alice'))!
          expect(winner.score).toBeGreaterThan(0)
          s = apply(s, 'boss', { type: 'advanceToNext', args: 'boss' })
        }
        expect(s.command).toBe('finished')
        expect(original.questionHistory).toHaveLength(0)
        const resumed = JSON.parse(JSON.stringify(s)) as GameState
        const rematch = apply(resumed, 'boss', { type: 'rematch', args: 'boss' })
        expect(rematch.command).toBe('rematch')
        expect(rematch.session).not.toBe(resumed.session)
        expect(rematch.players.every((p) => p.score === 0)).toBe(true)
        expect(rematch.bossId).toBe('boss')
        expect(rematch.hostId).toBe('host')
        expect(rematch.questionHistory).toEqual([])
      } finally {
        vi.useRealTimers()
      }
    })
})

it('binds every identity-bearing action to the socket and rejects strangers', () => {
  const s = next(start('classic'))
  for (const a of [
    { type: 'finishGame', args: 'host' },
    { type: 'saveSettings', args: { requesterId: 'host', config: DEFAULT_SETUP } },
    { type: 'submitAnswer', args: { playerId: 'alice', answer: 'Crosby' } },
    { type: 'joinGame', args: { id: 'host', name: 'Impersonator' } },
    { type: 'claimBoss', args: { playerId: 'host', token: s.bossToken } },
  ] as RoomAction[])
    expect(apply(s, 'stranger', a)).toBe(s)
  expect(
    apply(s, 'stranger', {
      type: 'submitAnswer',
      args: { playerId: 'stranger', answer: 'Crosby' },
    }),
  ).toBe(s)
  expect(apply(s, 'stranger', { type: 'requestHint', args: { hintType: 'team' } })).toBe(s)
  expect(applyRoomAction(s, 'host', new Set(), { type: 'finishGame', args: 'host' })).toBe(s)
})

it('validates field by field, strips extra fields, and rejects malformed messages', () => {
  for (const bad of [
    null,
    {},
    [],
    { type: '__proto__', args: {} },
    { type: 'constructor', args: {} },
    { type: 'submitAnswer', args: { playerId: 'alice', answer: 42 } },
    { type: 'activatePowerup', args: { playerId: 'alice', powerupType: '__proto__' } },
    {
      type: 'saveSettings',
      args: { requesterId: 'host', config: { ...DEFAULT_SETUP, questionCount: Infinity } },
    },
    {
      type: 'saveSettings',
      args: { requesterId: 'host', config: { ...DEFAULT_SETUP, hostPlays: 'yes' } },
    },
    { type: 'joinGame', args: { id: 'alice', name: ' '.repeat(5) } },
  ])
    expect(parseRoomAction(bad)).toBeNull()
  const parsed = parseRoomAction({
    type: 'saveSettings',
    args: { requesterId: 'host', config: { ...DEFAULT_SETUP, hostId: 'alice' } },
  })!
  expect((parsed.args as { config: object }).config).not.toHaveProperty('hostId')
  expect(parseRoomAction({ type: 'joinGame', args: { id: 'alice', name: ' Alice ' } })).toEqual({
    type: 'joinGame',
    args: { id: 'alice', name: 'Alice' },
  })
})

it('enforces phase and mode boundaries and validates mode-specific sequences', () => {
  const s = room()
  expect(apply(s, 'host', { type: 'tickCountdown', args: 'host' })).toBe(s)
  expect(apply(s, 'host', { type: 'advanceToNext', args: 'host' })).toBe(s)
  expect(
    apply(s, 'host', {
      type: 'startGame',
      args: { requesterId: 'host', bossToken: 't', gameMode: 'career', questionSequence: [q] },
    }),
  ).toBe(s)
  const playing = next(start('classic'))
  expect(
    apply(playing, 'host', {
      type: 'saveSettings',
      args: { requesterId: 'host', config: DEFAULT_SETUP },
    }),
  ).toBe(playing)
  expect(apply(playing, 'host', { type: 'nextCareerRound', args: { requesterId: 'host' } })).toBe(
    playing,
  )
})

it('resolves elimination on the server, consumes charges once and preserves the correct choice', () => {
  let s = next(start('classic'))
  s = apply(s, 'alice', {
    type: 'activatePowerup',
    args: { playerId: 'alice', powerupType: 'eliminate' },
  })
  expect(s.playerEliminatedChoices.alice).toHaveLength(2)
  expect(s.playerEliminatedChoices.alice).not.toContain('Sidney Crosby')
  expect(
    apply(s, 'alice', {
      type: 'activatePowerup',
      args: { playerId: 'alice', powerupType: 'eliminate' },
    }),
  ).toBe(s)
})

it('supports Change Settings directly from the final board and resets the completed game', () => {
  const finished: GameState = { ...room(), command: 'finished' }
  finished.players = finished.players.map((p) => ({ ...p, score: 100 }))
  const args = { requesterId: 'host', config: { ...DEFAULT_SETUP, questionCount: 5 } }
  expect(apply(finished, 'alice', { type: 'saveSettings', args })).toBe(finished)
  const configured = apply(finished, 'host', { type: 'saveSettings', args })
  expect(configured.command).toBe('rematch')
  expect(configured.questionCount).toBe(5)
  expect(configured.players.every((p) => p.score === 0)).toBe(true)
  expect(configured.session).not.toBe(finished.session)
})
