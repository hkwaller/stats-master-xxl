'use client'

import { useRef, useState } from 'react'
import type { Question } from '@/types/game'
import poolData from '@/native/offline/questions.json'
import { generateChoices } from '@/lib/data/choices'
import { calcScore, isCorrectAnswer } from '@/lib/game/classic'
import { useGameCompletion } from '@/hooks/useGameCompletion'
import { nativeFeedback } from '@/lib/native'
import { Button } from '@/components/design-system'

const pool = poolData as Question[]
const ROUND_COUNT = 10

type Round = { question: Question; choices: string[]; started: number }
function newRound(used: Set<string>): Round {
  const available = pool.filter(q => !used.has(q.id))
  const question = available[Math.floor(Math.random() * available.length)]
  used.add(question.id)
  return { question, choices: generateChoices(question, pool), started: Date.now() }
}

export function ClassicPractice({ onExit }: { onExit: () => void }) {
  const used = useRef(new Set<string>())
  const locked = useRef(false)
  const [round, setRound] = useState<Round | null>(null)
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [answer, setAnswer] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)
  const [session, setSession] = useState<string>()
  useGameCompletion(session, '/app/practice', 'practice', finished ? 'finished' : round ? 'active' : 'other')

  function start() {
    setSession(`practice:${crypto.randomUUID()}`)
    used.current.clear()
    locked.current = false
    setIndex(0); setScore(0); setAnswer(null); setFinished(false)
    setRound(newRound(used.current))
    void nativeFeedback()
  }
  function guess(choice: string) {
    if (!round || locked.current) return
    locked.current = true
    setAnswer(choice)
    const correct = isCorrectAnswer(choice, round.question)
    setScore(value => value + calcScore(Date.now() - round.started, round.question.difficulty, false, correct))
    void nativeFeedback(correct ? 'correct' : 'wrong')
  }
  function next() {
    void nativeFeedback()
    if (index + 1 === ROUND_COUNT) { setFinished(true); return }
    setIndex(value => value + 1)
    setAnswer(null)
    locked.current = false
    setRound(newRound(used.current))
  }

  const q = round?.question
  return (
    <section className="mx-auto w-full max-w-xl">
      <button className="app-text-action mb-6" onClick={onExit}>Back to home</button>
      <h1 className="font-display text-5xl leading-none font-extrabold uppercase">Classic practice</h1>
      <p className="mt-3 mb-7 text-sm text-ink-2">Offline · 10 rounds · Local scores only</p>
      {!round ? <div className="on-ice p-6"><p className="mb-6">Name the NHL skater from a season’s stats. Pick one of four names. Faster correct answers earn more points.</p><Button onClick={start}>Start practice</Button></div> : finished ? (
        <div className="on-ice p-6" aria-live="polite">
          <h2 className="font-display text-3xl font-bold uppercase">Final horn</h2>
          <p className="my-6 font-display text-6xl font-bold">{score} <span className="text-2xl">PTS</span></p>
          <p className="mb-6 text-sm text-ink-2">Practice complete. This score stays out of room and daily leaderboards.</p>
          <Button onClick={start}>Play again</Button>
        </div>
      ) : q && <>
        <div className="practice-score"><span>ROUND {index + 1} / {ROUND_COUNT}</span><span>{score} PTS</span></div>
        <div className="practice-board">
          <p className="mb-4 text-center font-mono text-sm">{q.season} · {q.teamAbbrevs} · {q.positionCode}</p>
          <dl className="practice-stats">{[['GP', q.gamesPlayed], ['G', q.goals], ['A', q.assists], ['PTS', q.points], ['PIM', q.penaltyMinutes]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        </div>
        <h2 className="mb-4 font-display text-3xl font-bold uppercase">Name the skater</h2>
        <div className="on-ice">{round.choices.map(choice => {
          const correct = isCorrectAnswer(choice, q)
          return <button key={choice} className="practice-choice" disabled={answer !== null} data-correct={answer !== null && correct} data-wrong={answer === choice && !correct} onClick={() => guess(choice)}>{choice}{answer !== null && correct ? ' · Correct' : answer === choice ? ' · Your answer' : ''}</button>
        })}</div>
        <p className="practice-result" role="status">{answer !== null ? (isCorrectAnswer(answer, q) ? 'Correct. Nice shot.' : `The skater was ${q.firstName} ${q.lastName}.`) : 'Choose your answer.'}</p>
        {answer !== null && <Button onClick={next} className="w-full">{index + 1 === ROUND_COUNT ? 'See final score' : 'Next round'}</Button>}
      </>}
    </section>
  )
}
