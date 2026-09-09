'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { SignInButton, useUser } from '@clerk/nextjs'
import { StatsCard } from './StatsCard'
import { AnswerRow } from './AnswerRow'
import { Button, Kickplate, MonoLabel, TierBadge } from '@/components/design-system'
import { getDailyChallenge } from '@/app/actions/game-actions'
import {
  getMyDailyChallengeScore,
  saveDailyChallengeScore,
  getDailyLeaderboard,
  type LeaderboardEntry,
  type LeaderboardPeriod,
} from '@/app/actions/daily-challenge-actions'
import type { Question } from '@/types/game'

const INK = '#0d1b2a'
const RED = '#cf0a2c'
const DEAD = '#b3c0cf'
const AMBER = '#f2b21c'

const ANSWER_LETTERS = ['A', 'B', 'C', 'D']

type StoredAnswer = { result: 'correct' | 'incorrect'; questionId: string }

type Phase =
  | { name: 'loading' }
  | { name: 'playing'; question: Question }
  | { name: 'answered'; result: 'correct' | 'incorrect'; question: Question }
  | { name: 'already_answered'; result: 'correct' | 'incorrect'; question: Question }

/** UTC date string, e.g. "2026-04-06". Computed locally - no server round-trip needed. */
function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

function getLocalAnswer(today: string): StoredAnswer | null {
  try {
    const raw = localStorage.getItem(`daily-challenge-${today}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setLocalAnswer(today: string, answer: StoredAnswer) {
  try {
    localStorage.setItem(`daily-challenge-${today}`, JSON.stringify(answer))
  } catch {
    // ignore
  }
}

export function DailyChallenge() {
  const { isLoaded, isSignedIn } = useUser()
  const [phase, setPhase] = useState<Phase>({ name: 'loading' })

  useEffect(() => {
    if (!isLoaded) return

    async function load() {
      const today = getTodayDateString()
      const local = getLocalAnswer(today)

      try {
        // The question is identical for everyone all day (and cached server-side),
        // so fetch it once. When signed in and not already answered locally, fetch
        // the saved score in parallel rather than in a second round-trip.
        const [q, record] = await Promise.all([
          getDailyChallenge(),
          !local && isSignedIn ? getMyDailyChallengeScore() : Promise.resolve(null),
        ])
        if (!q) return

        if (local) {
          setPhase({ name: 'already_answered', result: local.result, question: q })
          return
        }

        if (record) {
          const result = record.is_correct ? 'correct' : 'incorrect'
          setLocalAnswer(today, { result, questionId: record.question_id })
          setPhase({ name: 'already_answered', result, question: q })
          return
        }

        setPhase({ name: 'playing', question: q })
      } catch (err) {
        console.error(err)
      }
    }

    load()
  }, [isLoaded, isSignedIn])

  // Re-check Supabase when user signs in mid-session
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    if (phase.name !== 'playing') return

    async function checkAfterSignIn() {
      const today = getTodayDateString()
      const record = await getMyDailyChallengeScore()
      if (record && phase.name === 'playing') {
        const result = record.is_correct ? 'correct' : 'incorrect'
        setLocalAnswer(today, { result, questionId: record.question_id })
        setPhase({
          name: 'already_answered',
          result,
          question: (phase as { name: 'playing'; question: Question }).question,
        })
      }
    }

    checkAfterSignIn()
  }, [isSignedIn]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGuess(choice: string) {
    if (phase.name !== 'playing') return
    const { question } = phase
    const today = getTodayDateString()

    const isCorrect =
      choice.toLowerCase() === `${question.firstName} ${question.lastName}`.toLowerCase()
    const result = isCorrect ? 'correct' : 'incorrect'

    setLocalAnswer(today, { result, questionId: String(question.id) })

    if (isSignedIn) {
      saveDailyChallengeScore({
        questionId: String(question.id),
        isCorrect,
      }).catch(console.error)
    }

    setPhase({ name: 'answered', result, question })
  }

  if (phase.name === 'loading') {
    return (
      <div className="on-ice flex min-h-[320px] items-center justify-center p-6">
        <span className="animate-pulse">
          <MonoLabel size={10} tracking="0.24em">Loading today&apos;s skater</MonoLabel>
        </span>
      </div>
    )
  }

  if (phase.name === 'already_answered') {
    return <AlreadyAnswered result={phase.result} question={phase.question} />
  }

  if (phase.name === 'playing') {
    const { question } = phase
    const choices = question.choices ?? []

    return (
      <div className="on-ice overflow-hidden">
        <ChallengeHeader question={question} />

        <div className="flex flex-col gap-5 p-5">
          <StatsCard question={question} revealedColumns={5} size="hero" />

          <div className="grid gap-2.5 sm:grid-cols-2">
            {choices.map((choice, i) => (
              <AnswerRow
                key={choice}
                letter={ANSWER_LETTERS[i] ?? '?'}
                name={choice}
                variant="phone"
                onClick={() => handleGuess(choice)}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const { result, question } = phase as {
    name: 'answered'
    result: 'correct' | 'incorrect'
    question: Question
  }

  return (
    <div className="on-ice overflow-hidden">
      <ChallengeHeader question={question} />
      <div className="flex flex-col gap-5 p-5">
        <StatsCard question={question} revealedColumns={5} size="hero" />
        <ResultPlane
          result={result}
          question={question}
          note="New challenge drops at midnight UTC."
          isSignedIn={!!isSignedIn}
          isLoaded={isLoaded}
        />
        <LeaderboardPanel />
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function shortDateLabel(): string {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
}

/** A navy strip closed by the amber kickplate — the boards, in miniature. */
function ChallengeHeader({ question }: { question: Question }) {
  return (
    <>
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
        style={{ background: INK }}
      >
        <span
          className="font-mono"
          style={{
            fontSize: 9,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: AMBER,
          }}
        >
          Daily challenge
        </span>
        <div className="flex items-center gap-3">
          <TierBadge tier={question.difficulty} />
          <span
            className="font-mono"
            style={{ fontSize: 9, letterSpacing: '0.16em', color: '#8d9cb0' }}
          >
            {shortDateLabel()}
          </span>
        </div>
      </div>
      <Kickplate height={4} />
    </>
  )
}

/**
 * The outcome. Stated in words with the answer always spelled out, so nothing
 * depends on reading a colour.
 */
function ResultPlane({
  result,
  question,
  note,
  isSignedIn,
  isLoaded,
}: {
  result: 'correct' | 'incorrect'
  question: Question
  note: string
  isSignedIn?: boolean
  isLoaded?: boolean
}) {
  const correct = result === 'correct'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex flex-col gap-4 p-5"
      style={{
        background: correct ? 'rgba(207,10,44,0.06)' : '#ffffff',
        borderLeft: `5px solid ${correct ? RED : DEAD}`,
        boxShadow: '0 2px 10px rgba(13,27,42,0.07)',
      }}
    >
      <span
        className="font-display"
        style={{
          fontWeight: 800,
          fontSize: 36,
          lineHeight: 1,
          textTransform: 'uppercase',
          color: correct ? RED : INK,
        }}
      >
        {correct ? 'Nailed it' : 'Missed it'}
      </span>

      <div
        className="flex flex-col gap-1.5 pt-3"
        style={{ borderTop: '1px solid rgba(13,27,42,0.10)' }}
      >
        <MonoLabel size={9}>The answer was</MonoLabel>
        <span
          className="font-display"
          style={{ fontWeight: 800, fontSize: 30, lineHeight: 1, textTransform: 'uppercase' }}
        >
          {question.firstName} {question.lastName}
        </span>
        <MonoLabel size={9} tracking="0.14em">
          {question.season} · {question.teamAbbrevs} · {question.points} PTS
        </MonoLabel>
      </div>

      {isLoaded && !isSignedIn && (
        <div className="flex flex-col items-start gap-2 pt-1">
          <SignInButton mode="modal">
            <Button variant="secondary" size="sm">
              Sign in to save your score
            </Button>
          </SignInButton>
          <MonoLabel size={9} tracking="0.14em">And appear on the leaderboard</MonoLabel>
        </div>
      )}

      <MonoLabel size={9} tracking="0.14em">{note}</MonoLabel>
    </motion.div>
  )
}

function AlreadyAnswered({
  result,
  question,
}: {
  result: 'correct' | 'incorrect'
  question: Question
}) {
  return (
    <div className="on-ice overflow-hidden">
      <ChallengeHeader question={question} />
      <div className="flex flex-col gap-5 p-5">
        <StatsCard question={question} revealedColumns={5} size="hero" />
        <ResultPlane
          result={result}
          question={question}
          note="You already played today. New one at midnight UTC."
        />
        <LeaderboardPanel />
      </div>
    </div>
  )
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

const PERIODS: { id: LeaderboardPeriod; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'ytd', label: 'YTD' },
  { id: 'all', label: 'All time' },
]

function LeaderboardPanel() {
  const [period, setPeriod] = useState<LeaderboardPeriod>('today')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setEntries([])
    getDailyLeaderboard(period)
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [period])

  return (
    <div className="flex flex-col gap-3 pt-4" style={{ borderTop: '1px solid rgba(13,27,42,0.10)' }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MonoLabel size={10} tracking="0.22em">Leaderboard</MonoLabel>
        <div className="flex flex-wrap gap-px" style={{ background: 'rgba(13,27,42,0.12)' }}>
          {PERIODS.map((p) => {
            const selected = period === p.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                aria-pressed={selected}
                className="btn-ice font-mono"
                style={{
                  border: 'none',
                  borderRadius: 0,
                  padding: '5px 9px',
                  fontSize: 9,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  background: selected ? INK : '#ffffff',
                  color: selected ? '#eef3f9' : '#55677d',
                  cursor: 'pointer',
                }}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <span className="animate-pulse py-2">
          <MonoLabel size={9}>Loading</MonoLabel>
        </span>
      ) : entries.length === 0 ? (
        <span className="py-2">
          <MonoLabel size={9}>No entries yet</MonoLabel>
        </span>
      ) : (
        <ol className="flex list-none flex-col p-0">
          {entries.map((entry, i) => (
            <li
              key={entry.userId}
              className="flex items-center gap-3 px-2 py-2"
              style={{
                borderBottom: '1px solid rgba(13,27,42,0.07)',
                background: i === 0 ? 'rgba(207,10,44,0.07)' : 'transparent',
              }}
            >
              <span
                className="font-mono shrink-0"
                style={{ fontSize: 10, width: 18, color: i === 0 ? RED : '#55677d' }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span
                className="font-display min-w-0 flex-1 truncate"
                style={{ fontWeight: 700, fontSize: 19, textTransform: 'uppercase', color: INK }}
              >
                {entry.displayName}
              </span>
              <span className="ml-auto shrink-0">
                <MonoLabel size={9} tracking="0.14em">
                  {period === 'today' && entry.answeredAt
                    ? new Date(entry.answeredAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'UTC',
                        timeZoneName: 'short',
                      })
                    : `${entry.correctCount} correct`}
                </MonoLabel>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
