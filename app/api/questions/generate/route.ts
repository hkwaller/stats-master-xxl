import { NextRequest, NextResponse } from 'next/server'
import { QuestionSelector } from '@/lib/data/selection'
import { getQuestionsByTiers } from '@/lib/data/database'
import { generateChoices } from '@/lib/data/choices'
import type { DifficultyTier, AnswerMode } from '@/types/game'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      tiers: DifficultyTier[]
      eras?: string[]
      count: number
      answerMode: AnswerMode
      excludeIds?: string[]
    }

    const selector = new QuestionSelector(body.tiers, body.eras, body.excludeIds ?? [])
    const questions = selector.generateSequence(body.count)

    // Pre-embed choices in each question for multiple choice mode
    if (body.answerMode === 'multiplechoice') {
      const pool = getQuestionsByTiers(body.tiers, body.eras)
      const questionsWithChoices = questions.map((q) => ({
        ...q,
        choices: generateChoices(q, pool),
      }))
      return NextResponse.json({ questions: questionsWithChoices })
    }

    return NextResponse.json({ questions })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
