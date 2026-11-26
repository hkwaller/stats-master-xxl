import { describe, expect, it } from 'vitest'
import { isCorrectAnswer, calcScore } from './classic'
import type { Question } from '../../types/game'

describe('shared Classic rules', () => {
  const question: Question = { id: '1', playerId: 1, firstName: 'Wayne', lastName: 'Gretzky', seasonId: 19851986, season: '1985-86', era: '1980s', positionCode: 'C', teamAbbrevs: 'EDM', teamNames: 'Edmonton Oilers', points: 215, gamesPlayed: 80, goals: 52, assists: 163, penaltyMinutes: 52, difficulty: 'easy' }
  it('accepts normalized full names or last names, without accepting partial guesses', () => {
    expect(isCorrectAnswer('  WAYNE   Gretzky ', question)).toBe(true)
    expect(isCorrectAnswer('gretzky', question)).toBe(true)
    expect(isCorrectAnswer('Wayne', question)).toBe(false)
    expect(isCorrectAnswer('', question)).toBe(false)
  })
  it('preserves tier bases, elapsed speed bonus, wrong answers and double-down penalties', () => {
    expect(calcScore(0, 'expert', false, true)).toBe(210)
    expect(calcScore(20000, 'easy', false, true)).toBe(105)
    expect(calcScore(80000, 'medium', false, true)).toBe(100)
    expect(calcScore(0, 'hard', true, true)).toBe(360)
    expect(calcScore(0, 'easy', false, false)).toBe(0)
    expect(calcScore(0, 'easy', true, false)).toBe(-50)
  })
})
