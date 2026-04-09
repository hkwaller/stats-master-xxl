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
      <div className="bg-white border-8 border-black rounded-sm p-6 shadow-[12px_12px_0_#000] rotate-[1deg] text-center min-h-[300px] flex items-center justify-center">
        <p className="font-bold uppercase tracking-widest text-game-text-muted animate-pulse">
          Loading Daily Challenge...
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
      <div className="bg-white border-8 border-black rounded-sm p-6 shadow-[12px_12px_0_#000] rotate-[1deg] space-y-4">
        <ChallengeHeader question={question} />
        <p className="font-mono font-bold text-sm text-black">
          Can you guess the player from these stats?
        </p>
        <div className="relative">
          <StatsCard question={question} revealedColumns={5} />
        </div>
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-black/10 mt-4">
          {choices.map((choice) => (
            <Button
              key={choice}
              variant="secondary"
              size="md"
              className="text-sm shadow-[4px_4px_0_#000]"
              onClick={() => handleGuess(choice)}
            >
              {choice}
            </Button>
          ))}
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
    <div className="bg-white border-8 border-black rounded-sm p-6 shadow-[12px_12px_0_#000] rotate-[1deg] space-y-4">
      <ChallengeHeader question={question} />
      <div className="relative">
        <StatsCard question={question} revealedColumns={5} />
      </div>
      <ResultBanner result={result} question={question} isSignedIn={!!isSignedIn} isLoaded={isLoaded} />
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChallengeHeader({ question }: { question: Question }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="bg-yellow border-2 border-black inline-block px-3 py-1 shadow-[2px_2px_0_#000] rotate-[-2deg]">
        <h3 className="font-display font-bold uppercase text-black text-xl tracking-wider">
          Daily Challenge
        </h3>
      </div>
      <TierBadge tier={question.difficulty} />
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
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={`border-4 border-black p-4 text-center mt-2 rotate-[-1deg] ${
        result === 'correct'
          ? 'bg-lime text-black shadow-[4px_4px_0_#000]'
          : 'bg-game-red text-white shadow-[4px_4px_0_#000]'
      }`}
    >
      <h2 className="text-3xl font-display font-bold uppercase mb-2">
        {result === 'correct' ? 'Nailed It! 🔥' : 'Incorrect! 🧊'}
      </h2>
      <div className="font-bold text-sm mb-3">
        It was{' '}
        <span className="inline-block bg-black text-white px-2 py-0.5 mx-1 font-mono">
          {question.firstName} {question.lastName}
        </span>
      </div>

      {isLoaded && !isSignedIn && (
        <div className="mb-3 border-2 border-black bg-yellow text-black p-2 text-xs font-mono font-bold shadow-[2px_2px_0_#000] rotate-[1deg]">
          <SignInButton mode="modal">
            <Button variant="secondary" size="sm" className="underline cursor-pointer">
              Sign in to save your score
            </Button>
          </SignInButton>
          and appear on the leaderboard.
        </div>
      )}

      <p className="text-xs font-mono opacity-70 mt-1">New challenge drops at midnight UTC.</p>

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
  return (
    <div className="bg-white border-8 border-black rounded-sm p-6 shadow-[12px_12px_0_#000] rotate-[1deg] space-y-4">
      <ChallengeHeader question={question} />

      <div className="relative">
        <StatsCard question={question} revealedColumns={5} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`border-4 border-black p-4 text-center rotate-[-1deg] ${
          result === 'correct'
            ? 'bg-lime text-black shadow-[4px_4px_0_#000]'
            : 'bg-game-red text-white shadow-[4px_4px_0_#000]'
        }`}
      >
        <h2 className="text-2xl font-display font-bold uppercase mb-1">
          {result === 'correct' ? 'You got it! 🔥' : 'Better luck tomorrow 🧊'}
        </h2>
        <div className="font-bold text-sm mb-2">
          It was{' '}
          <span className="inline-block bg-black text-white px-2 py-0.5 mx-1 font-mono">
            {question.firstName} {question.lastName}
          </span>
        </div>
        <p className="text-xs font-mono opacity-70">
          You already played today&apos;s challenge. New one at midnight UTC.
        </p>

        <LeaderboardPanel />
      </motion.div>
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
    <div className="mt-4 border-t-2 border-black/30 pt-3 text-left">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-mono font-bold uppercase tracking-widest opacity-80">
          Leaderboard
        </p>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 border-2 border-black transition-colors ${
                period === p.id
                  ? 'bg-black text-white'
                  : 'bg-white/20 text-inherit hover:bg-black/10'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-xs font-mono opacity-60 animate-pulse py-2">Loading...</p>
      ) : entries.length === 0 ? (
        <p className="text-xs font-mono opacity-60 py-2">No entries yet.</p>
      ) : (
        <ol className="space-y-1.5">
          {entries.map((entry, i) => (
            <li key={entry.userId} className="flex items-center gap-2 text-xs font-mono">
              <span
                className={`font-bold w-5 text-right shrink-0 ${
                  i === 0 ? 'text-yellow-500' : i === 1 ? 'opacity-60' : i === 2 ? 'opacity-50' : 'opacity-40'
                }`}
              >
                {i + 1}.
              </span>
              <span className="font-bold truncate">{entry.displayName}</span>
              <span className="opacity-50 ml-auto shrink-0 tabular-nums">
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
