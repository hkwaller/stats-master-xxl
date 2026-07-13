'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { SignInButton, useUser } from '@clerk/nextjs'
import { StatsCard } from './StatsCard'
import { Button, TierBadge } from '@/components/design-system'
import { getDailyChallenge, getTodayDateString } from '@/app/actions/game-actions'
import {
  getMyDailyChallengeScore,
  saveDailyChallengeScore,
  getDailyLeaderboard,
  type LeaderboardEntry,
  type LeaderboardPeriod,
} from '@/app/actions/daily-challenge-actions'
import type { Question } from '@/types/game'

// ─── Fresh Ice palette ─────────────────────────────────────────────────────────
const INK = '#0a1535'
const ROYAL = '#003087'
const RED = '#e32437'
const YELLOW = '#ffcf33'
const GREEN = '#2cc66b'
const MUTED = '#6b7ea0'
const FILL = '#eef1f8'

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: `2px solid ${INK}`,
  borderRadius: 16,
  boxShadow: `0 6px 0 ${INK}`,
}

type StoredAnswer = { result: 'correct' | 'incorrect'; questionId: string }

type Phase =
  | { name: 'loading' }
  | { name: 'playing'; question: Question }
  | { name: 'answered'; result: 'correct' | 'incorrect'; question: Question }
  | { name: 'already_answered'; result: 'correct' | 'incorrect'; question: Question }

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
      const today = await getTodayDateString()

      const local = getLocalAnswer(today)
      if (local) {
        const q = await getDailyChallenge()
        if (q) setPhase({ name: 'already_answered', result: local.result, question: q })
        return
      }

      if (isSignedIn) {
        const record = await getMyDailyChallengeScore()
        if (record) {
          const q = await getDailyChallenge()
          if (q) {
            const result = record.is_correct ? 'correct' : 'incorrect'
            setLocalAnswer(today, { result, questionId: record.question_id })
            setPhase({ name: 'already_answered', result, question: q })
          }
          return
        }
      }

      try {
        const q = await getDailyChallenge()
        if (q) setPhase({ name: 'playing', question: q })
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
      const today = await getTodayDateString()
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
    const today = await getTodayDateString()

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
      <div
        style={{ ...cardStyle, minHeight: 300 }}
        className="p-6 text-center flex items-center justify-center"
      >
        <p
          className="animate-pulse"
          style={{
            fontFamily: 'var(--font-archivo-black), "Archivo Black", sans-serif',
            fontSize: 11,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: MUTED,
          }}
        >
          Loading Daily Challenge…
        </p>
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
      <div style={cardStyle} className="overflow-hidden">
        <ChallengeHeader question={question} />
        <div className="p-5 space-y-4">
          <div>
            <h3
              style={{
                fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
                fontSize: 20,
                lineHeight: 1.05,
                color: INK,
                margin: 0,
              }}
            >
              Today&apos;s Mystery Skater
            </h3>
            <p
              style={{
                fontFamily: 'var(--font-space-grotesk), sans-serif',
                fontSize: 13,
                color: MUTED,
                marginTop: 4,
              }}
            >
              Can you guess the player from these stats?
            </p>
          </div>

          <StatsCard question={question} revealedColumns={5} />

          <div
            className="grid grid-cols-2 gap-3 pt-4"
            style={{ borderTop: `1px solid ${FILL}`, marginTop: 4 }}
          >
            {choices.map((choice) => (
              <Button
                key={choice}
                variant="secondary"
                size="md"
                className="text-sm"
                onClick={() => handleGuess(choice)}
              >
                {choice}
              </Button>
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
    <div style={cardStyle} className="overflow-hidden">
      <ChallengeHeader question={question} />
      <div className="p-5 space-y-4">
        <StatsCard question={question} revealedColumns={5} />
        <ResultBanner result={result} question={question} isSignedIn={!!isSignedIn} isLoaded={isLoaded} />
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function shortDateLabel(): string {
  return new Date()
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    .toUpperCase()
}

function ChallengeHeader({ question }: { question: Question }) {
  return (
    <div
      style={{
        background: INK,
        borderBottom: `2px solid ${INK}`,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
      }}
    >
      <span
        style={{
          color: YELLOW,
          fontFamily: 'var(--font-archivo-black), "Archivo Black", sans-serif',
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          lineHeight: 1.1,
        }}
      >
        ⭐ Daily Challenge
      </span>
      <div className="flex items-center gap-3">
        <TierBadge tier={question.difficulty} />
        <span
          style={{
            color: '#ffffff',
            fontFamily: 'var(--font-jetbrains-mono), "JetBrains Mono", monospace',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
          }}
        >
          {shortDateLabel()}
        </span>
      </div>
    </div>
  )
}

function ResultBanner({
  result,
  question,
  isSignedIn,
  isLoaded,
}: {
  result: 'correct' | 'incorrect'
  question: Question
  isSignedIn: boolean
  isLoaded: boolean
}) {
  const correct = result === 'correct'
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      style={{
        background: correct ? GREEN : RED,
        color: correct ? INK : '#ffffff',
        border: `2px solid ${INK}`,
        borderRadius: 12,
        boxShadow: `0 4px 0 ${INK}`,
        padding: 16,
        textAlign: 'center',
        marginTop: 8,
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
          fontSize: 24,
          lineHeight: 1,
          marginBottom: 8,
        }}
      >
        {correct ? 'Nailed It! 🔥' : 'Incorrect! 🧊'}
      </h2>
      <div
        style={{
          fontFamily: 'var(--font-space-grotesk), sans-serif',
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 12,
        }}
      >
        It was{' '}
        <span
          style={{
            display: 'inline-block',
            background: INK,
            color: '#ffffff',
            padding: '3px 10px',
            margin: '0 4px',
            borderRadius: 8,
            fontFamily: 'var(--font-jetbrains-mono), "JetBrains Mono", monospace',
            fontSize: 13,
          }}
        >
          {question.firstName} {question.lastName}
        </span>
      </div>

      {isLoaded && !isSignedIn && (
        <div
          style={{
            marginBottom: 12,
            border: `2px solid ${INK}`,
            background: '#ffffff',
            color: INK,
            borderRadius: 10,
            boxShadow: `0 2px 0 rgba(10,21,53,0.25)`,
            padding: '10px 12px',
            fontFamily: 'var(--font-space-grotesk), sans-serif',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <SignInButton mode="modal">
            <Button variant="secondary" size="sm" className="cursor-pointer">
              Sign in to save your score
            </Button>
          </SignInButton>
          <span style={{ display: 'block', marginTop: 8 }}>and appear on the leaderboard.</span>
        </div>
      )}

      <p
        style={{
          fontFamily: 'var(--font-jetbrains-mono), "JetBrains Mono", monospace',
          fontSize: 11,
          opacity: 0.7,
          marginTop: 4,
        }}
      >
        New challenge drops at midnight UTC.
      </p>

      <LeaderboardPanel />
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
  const correct = result === 'correct'
  return (
    <div style={cardStyle} className="overflow-hidden">
      <ChallengeHeader question={question} />

      <div className="p-5 space-y-4">
        <StatsCard question={question} revealedColumns={5} />

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: correct ? GREEN : RED,
            color: correct ? INK : '#ffffff',
            border: `2px solid ${INK}`,
            borderRadius: 12,
            boxShadow: `0 4px 0 ${INK}`,
            padding: 16,
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
              fontSize: 20,
              lineHeight: 1,
              marginBottom: 6,
            }}
          >
            {correct ? 'You got it! 🔥' : 'Better luck tomorrow 🧊'}
          </h2>
          <div
            style={{
              fontFamily: 'var(--font-space-grotesk), sans-serif',
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            It was{' '}
            <span
              style={{
                display: 'inline-block',
                background: INK,
                color: '#ffffff',
                padding: '3px 10px',
                margin: '0 4px',
                borderRadius: 8,
                fontFamily: 'var(--font-jetbrains-mono), "JetBrains Mono", monospace',
                fontSize: 13,
              }}
            >
              {question.firstName} {question.lastName}
            </span>
          </div>
          <p
            style={{
              fontFamily: 'var(--font-jetbrains-mono), "JetBrains Mono", monospace',
              fontSize: 11,
              opacity: 0.7,
            }}
          >
            You already played today&apos;s challenge. New one at midnight UTC.
          </p>

          <LeaderboardPanel />
        </motion.div>
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
  { id: 'all', label: 'All Time' },
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
    <div
      className="text-left"
      style={{ marginTop: 16, borderTop: `2px solid rgba(10,21,53,0.2)`, paddingTop: 12 }}
    >
      <div className="flex items-center justify-between mb-3" style={{ flexWrap: 'wrap', gap: 8 }}>
        <p
          style={{
            fontFamily: 'var(--font-jetbrains-mono), "JetBrains Mono", monospace',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            opacity: 0.85,
          }}
        >
          Leaderboard
        </p>
        <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
          {PERIODS.map((p) => {
            const selected = period === p.id
            return (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                style={{
                  fontFamily: 'var(--font-jetbrains-mono), "JetBrains Mono", monospace',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '3px 9px',
                  borderRadius: 8,
                  border: `2px solid ${INK}`,
                  background: selected ? ROYAL : FILL,
                  color: selected ? '#ffffff' : MUTED,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s, color 0.15s',
                }}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <p
          className="animate-pulse"
          style={{
            fontFamily: 'var(--font-jetbrains-mono), "JetBrains Mono", monospace',
            fontSize: 11,
            opacity: 0.6,
            padding: '8px 0',
          }}
        >
          Loading…
        </p>
      ) : entries.length === 0 ? (
        <p
          style={{
            fontFamily: 'var(--font-jetbrains-mono), "JetBrains Mono", monospace',
            fontSize: 11,
            opacity: 0.6,
            padding: '8px 0',
          }}
        >
          No entries yet.
        </p>
      ) : (
        <ol className="space-y-1.5">
          {entries.map((entry, i) => (
            <li
              key={entry.userId}
              className="flex items-center gap-2"
              style={{
                fontFamily: 'var(--font-jetbrains-mono), "JetBrains Mono", monospace',
                fontSize: 12,
              }}
            >
              <span
                className="w-5 text-right shrink-0"
                style={{
                  fontWeight: 700,
                  color: i === 0 ? YELLOW : 'inherit',
                  opacity: i === 0 ? 1 : i === 1 ? 0.6 : i === 2 ? 0.5 : 0.4,
                }}
              >
                {i + 1}.
              </span>
              <span className="truncate" style={{ fontWeight: 700 }}>
                {entry.displayName}
              </span>
              <span className="ml-auto shrink-0 tabular-nums" style={{ opacity: 0.55 }}>
                {period === 'today' && entry.answeredAt
                  ? new Date(entry.answeredAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'UTC',
                      timeZoneName: 'short',
                    })
                  : `${entry.correctCount} correct`}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
