import { describe, expect, it } from 'vitest'
import { isCorrectAnswer, calcScore } from './classic'
import { generateChoices } from '../data/choices'
import snapshot from '../../native/offline/questions.json'
import type { Question } from '../../types/game'

const questions = snapshot as Question[]
describe('shared Classic rules and offline content', () => {
  const question = { ...questions[0], firstName: 'Wayne', lastName: 'Gretzky' }
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
  it('every bundled season has four distinct choices including exactly one correct answer', () => {
    expect(questions.length).toBeGreaterThan(2000)
    expect(new Set(questions.map(q => q.id)).size).toBe(questions.length)
    for (const q of questions) {
      expect(q.points).toBe(q.goals + q.assists)
      expect(q.gamesPlayed).toBeGreaterThan(0)
      const choices = generateChoices(q, questions, Number(q.id))
      expect(new Set(choices).size).toBe(4)
      expect(choices.filter(choice => isCorrectAnswer(choice, q))).toHaveLength(1)
    }
  })
})
