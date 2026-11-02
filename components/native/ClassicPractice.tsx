'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import type { Question } from '@/types/game'
import { SCORE_SPEED_MAX, SCORE_SPEED_WINDOW_MS } from '@/types/game'
import poolData from '@/native/offline/questions.json'
import { generateChoices } from '@/lib/data/choices'
import { calcScore, isCorrectAnswer } from '@/lib/game/classic'
import { useGameCompletion } from '@/hooks/useGameCompletion'
import { nativeFeedback } from '@/lib/native'
import { Button, Kickplate, MonoLabel, ProgressTrack, TierBadge } from '@/components/design-system'
import { Jumbotron, JumbotronPanel } from '@/components/arcade/Jumbotron'
import { AnswerRow, type AnswerState } from '@/components/game/AnswerRow'

const pool = poolData as Question[]
const ROUND_COUNT = 10
const LETTERS = ['A', 'B', 'C', 'D']
const BEST_KEY = 'nhl-stats-master:practice-best'

type Round = { question: Question; choices: string[]; started: number }
type Shot = { goal: boolean; points: number }

function newRound(used: Set<string>): Round {
  const available = pool.filter(q => !used.has(q.id))
  const question = available[Math.floor(Math.random() * available.length)]
  used.add(question.id)
  return { question, choices: generateChoices(question, pool), started: Date.now() }
}
function readBest() {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0 } catch { return 0 }
}
function saveBest(score: number) {
  try { localStorage.setItem(BEST_KEY, String(score)) } catch { /* Private mode keeps no record. */ }
}
function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
function streakOf(shots: Shot[]) {
  let run = 0
  for (let i = shots.length - 1; i >= 0 && shots[i].goal; i--) run++
  return run
}
function bestStreak(shots: Shot[]) {
  let best = 0, run = 0
  for (const shot of shots) { run = shot.goal ? run + 1 : 0; best = Math.max(best, run) }
  return best
}
// Broadcast calls for consecutive goals. Three in a row is the one that matters.
function goalCall(streak: number) {
  if (streak === 3) return 'Hat trick'
  if (streak > 3) return `${streak} straight`
  return 'Goal'
}

/** Ten slots, one per shot. Result is carried by icon and label, never colour alone. */
function ShotChart({ shots, current }: { shots: Shot[]; current?: number }) {
  return (
    <ol className="practice-shots" aria-label="Shot chart">
      {Array.from({ length: ROUND_COUNT }, (_, i) => {
        const shot = shots[i]
        const state = shot ? (shot.goal ? 'goal' : 'miss') : i === current ? 'current' : 'open'
        const label = shot ? `Shot ${i + 1}: ${shot.goal ? `goal, ${shot.points} points` : 'saved'}` : `Shot ${i + 1}: ${i === current ? 'on now' : 'to come'}`
        return (
          <li key={i} data-state={state} aria-label={label} className={state === 'miss' ? 'penalty-hatch' : undefined}>
            {state === 'goal' && <Check size={14} strokeWidth={2.4} aria-hidden="true" />}
            {state === 'miss' && <X size={14} strokeWidth={2.4} aria-hidden="true" />}
          </li>
        )
      })}
    </ol>
  )
}

/** The speed bonus drains in real time, so the clock is the thing you are playing against. */
function SpeedBonus({ started, stopped }: { started: number; stopped: number | null }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (stopped !== null) return
    const id = window.setInterval(() => setNow(Date.now()), 200)
    return () => window.clearInterval(id)
  }, [stopped])
  const elapsed = (stopped ?? now) - started
  const fraction = Math.max(0, 1 - elapsed / SCORE_SPEED_WINDOW_MS)
  const bonus = Math.round(SCORE_SPEED_MAX * fraction)
  return (
    <div className="practice-bonus">
      <div className="flex items-baseline justify-between">
        <MonoLabel size={9}>Speed bonus</MonoLabel>
        <span className="font-display text-xl font-extrabold tabular-nums" style={{ color: bonus <= 6 ? 'var(--color-red)' : undefined }}>+{bonus}</span>
      </div>
      <ProgressTrack fraction={fraction} urgent={stopped === null && bonus > 0 && bonus <= 6} height={4} className="mt-2" />
    </div>
  )
}

/** LED digits roll up to the final score once. Reduced motion lands on the number. */
function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(() => (reducedMotion() ? value : 0))
  useEffect(() => {
    if (reducedMotion()) { setShown(value); return }
    let frame = 0
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 900)
      setShown(Math.round(value * (1 - Math.pow(1 - p, 4))))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])
  return <>{shown}</>
}

export function ClassicPractice({ onExit }: { onExit: () => void }) {
  const used = useRef(new Set<string>())
  const locked = useRef(false)
  const [round, setRound] = useState<Round | null>(null)
  const [index, setIndex] = useState(0)
  const [shots, setShots] = useState<Shot[]>([])
  const [answer, setAnswer] = useState<string | null>(null)
  const [answeredAt, setAnsweredAt] = useState<number | null>(null)
  const [finished, setFinished] = useState(false)
  const [best, setBest] = useState(0)
  const [previousBest, setPreviousBest] = useState(0)
  const [session, setSession] = useState<string>()
  useGameCompletion(session, '/app/practice', 'practice', finished ? 'finished' : round ? 'active' : 'other')
  useEffect(() => { setBest(readBest()) }, [])

  const score = shots.reduce((sum, shot) => sum + shot.points, 0)

  function start() {
    setSession(`practice:${crypto.randomUUID()}`)
    used.current.clear()
    locked.current = false
    setIndex(0); setShots([]); setAnswer(null); setAnsweredAt(null); setFinished(false)
    setPreviousBest(readBest())
    setRound(newRound(used.current))
    void nativeFeedback()
  }
  function guess(choice: string) {
    if (!round || locked.current) return
    locked.current = true
    const at = Date.now()
    const correct = isCorrectAnswer(choice, round.question)
    setAnswer(choice)
    setAnsweredAt(at)
    setShots(value => [...value, { goal: correct, points: calcScore(at - round.started, round.question.difficulty, false, correct) }])
    void nativeFeedback(correct ? 'correct' : 'wrong')
  }
  function next() {
    void nativeFeedback()
    if (index + 1 === ROUND_COUNT) {
      if (score > readBest()) { saveBest(score); setBest(score) }
      setFinished(true)
      return
    }
    setIndex(value => value + 1)
    setAnswer(null)
    setAnsweredAt(null)
    locked.current = false
    setRound(newRound(used.current))
  }

  // 1–4 or A–D picks a name, so a keyboard player never leaves the home row.
  useEffect(() => {
    if (!round || finished || answer !== null) return
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const key = event.key.toUpperCase()
      const i = /^[1-4]$/.test(key) ? Number(key) - 1 : LETTERS.indexOf(key)
      if (i >= 0 && round.choices[i]) { event.preventDefault(); guess(round.choices[i]) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const q = round?.question
  const last = shots[shots.length - 1]
  const streak = streakOf(shots)
  const goals = shots.filter(shot => shot.goal).length

  return (
    <section className="mx-auto w-full max-w-xl">
      <button className="app-text-action mb-6" onClick={onExit}>Back to home</button>
      {!round ? (
        <>
          <h1 className="font-display text-5xl leading-none font-extrabold uppercase">Classic practice</h1>
          <p className="mt-3 mb-7 text-sm text-ink-2">Offline · 10 shots · Local scores only</p>
          <div className="on-ice practice-intro">
            <p>The jumbotron lights up a real NHL season. Four names, one skater. Every correct pick is a goal, and the speed bonus drains while you think.</p>
            <ShotChart shots={[]} />
            {best > 0 && <p className="practice-best-line"><MonoLabel size={9}>Personal best</MonoLabel><span className="font-display text-2xl font-extrabold tabular-nums">{best}</span></p>}
            <Button onClick={start} className="w-full">Drop the puck</Button>
          </div>
        </>
      ) : finished ? (
        <div className="practice-final" aria-live="polite">
          <h1 className="font-display text-5xl leading-none font-extrabold uppercase">Final horn</h1>
          <JumbotronPanel className="mt-6" screenPad="20px 18px">
            <div className="flex items-center justify-between">
              <span className="practice-led-label">Practice · Final</span>
              <span className="practice-led-label">{goals} / {ROUND_COUNT} goals</span>
            </div>
            <p className="practice-final-score tabular-nums"><CountUp value={score} /><span>PTS</span></p>
            {score > previousBest && previousBest > 0 && <p className="practice-led-call reveal-name">New personal best</p>}
            {previousBest === 0 && score > 0 && <p className="practice-led-call reveal-name">First mark on the board</p>}
          </JumbotronPanel>
          <div className="on-ice practice-final-sheet">
            <ShotChart shots={shots} />
            <dl className="practice-final-stats">
              <div><dt>Goals</dt><dd>{goals}</dd></div>
              <div><dt>Best streak</dt><dd>{bestStreak(shots)}</dd></div>
              <div><dt>Personal best</dt><dd>{best}</dd></div>
            </dl>
            <p className="text-sm text-ink-2">Practice scores stay on this device and out of room and daily leaderboards.</p>
            <Button onClick={start} className="w-full" autoFocus>Play again</Button>
          </div>
        </div>
      ) : q && <>
        <div className="practice-bug">
          <span><MonoLabel size={9} color="rgba(255,255,255,.72)">Shot</MonoLabel><b className="tabular-nums">{index + 1}<small>/{ROUND_COUNT}</small></b></span>
          <span aria-label={`Streak ${streak}`}><MonoLabel size={9} color="rgba(255,255,255,.72)">Streak</MonoLabel><b className="tabular-nums">{streak}</b></span>
          <span className="practice-bug-score">
            <MonoLabel size={9} color="rgba(255,255,255,.72)">Pts</MonoLabel>
            <b key={score} className="tabular-nums score-change">{score}</b>
            {answer !== null && last?.goal && <span key={`delta-${index}`} className="score-delta practice-delta" aria-hidden="true">+{last.points}</span>}
          </span>
        </div>
        <Kickplate />
        <ShotChart shots={shots} current={index} />

        <div className="practice-stage" key={`stage-${q.id}`}>
          <div className="practice-lamp" data-lit={answer !== null && last?.goal} aria-hidden="true" />
          <Jumbotron
            size="phone"
            struts={false}
            topLeft={q.season}
            topRight={`${q.teamAbbrevs} · ${q.positionCode}`}
            cells={[
              { abbr: 'GP', value: q.gamesPlayed },
              { abbr: 'G', value: q.goals },
              { abbr: 'A', value: q.assists },
              { abbr: 'PTS', value: q.points, emphasis: true },
              { abbr: 'PIM', value: q.penaltyMinutes },
            ]}
          />
        </div>

        <div className="practice-prompt">
          <h2 className="font-display text-3xl font-bold uppercase">Name the skater</h2>
          <TierBadge tier={q.difficulty} />
        </div>
        <SpeedBonus key={`bonus-${q.id}`}started={round.started} stopped={answeredAt} />

        <div className="practice-choices" key={`choices-${q.id}`}>
          {round.choices.map((choice, i) => {
            const correct = isCorrectAnswer(choice, q)
            const state: AnswerState = answer === null ? 'default' : correct ? 'correct' : answer === choice ? 'eliminated' : 'faded'
            const meta = answer === null ? undefined : correct ? (answer === choice ? 'Your pick · Goal' : 'The skater') : answer === choice ? 'Your pick · Saved' : undefined
            return (
              <div key={choice} style={{ animationDelay: `${i * 45}ms` }}>
                <AnswerRow letter={LETTERS[i]} name={choice} meta={meta} state={state} variant="phone" disabled={answer !== null} onClick={() => guess(choice)} />
              </div>
            )
          })}
        </div>

        <div className="practice-call" role="status">
          {answer === null ? <p className="text-sm text-ink-2">Pick a name. Keys 1–4 work too.</p> : last?.goal ? (
            <div className="reveal-name" key={`call-${index}`}>
              <strong>{goalCall(streak)}</strong>
              <span>+{last.points} for {q.firstName} {q.lastName}</span>
            </div>
          ) : (
            <div className="reveal-name practice-call-miss" key={`call-${index}`}>
              <strong>Saved</strong>
              <span>It was {q.firstName} {q.lastName}{streakOf(shots.slice(0, -1)) >= 3 ? '. Streak over.' : '.'}</span>
            </div>
          )}
        </div>
        {answer !== null && <Button onClick={next} className="w-full" autoFocus>{index + 1 === ROUND_COUNT ? 'Final horn' : 'Next shot'}</Button>}
      </>}
    </section>
  )
}
