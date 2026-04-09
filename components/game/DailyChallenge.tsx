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
} from '@/app/actions/daily-challenge-actions'
import type { Question } from '@/types/game'

type StoredAnswer = { result: 'correct' | 'incorrect'; questionId: string }

type Phase =
  | { name: 'loading' }
  | { name: 'playing'; question: Question }
  | { name: 'answered'; result: 'correct' | 'incorrect'; question: Question }
  | {
      name: 'already_answered'
      result: 'correct' | 'incorrect'
      question: Question
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
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false)

  // Load question + check if already answered
  useEffect(() => {
    if (!isLoaded) return

    async function load() {
      const today = await getTodayDateString()

      // 1. Check localStorage first (instant)
      const local = getLocalAnswer(today)
      if (local) {
        const q = await getDailyChallenge()
        if (q) {
          setPhase({
            name: 'already_answered',
            result: local.result,
            question: q,
          })
          loadLeaderboard()
        }
        return
      }

      // 2. If signed in, check Supabase (restores state if localStorage was cleared)
      if (isSignedIn) {
        const record = await getMyDailyChallengeScore()
        if (record) {
          const q = await getDailyChallenge()
          if (q) {
            const result = record.is_correct ? 'correct' : 'incorrect'
            setLocalAnswer(today, { result, questionId: record.question_id })
            setPhase({ name: 'already_answered', result, question: q })
            loadLeaderboard()
          }
          return
        }
      }

      // 3. Not answered yet — load the question
      try {
        const q = await getDailyChallenge()
        if (q) {
          setPhase({ name: 'playing', question: q })
        }
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
        loadLeaderboard()
      }
    }

    checkAfterSignIn()
  }, [isSignedIn]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadLeaderboard() {
    setLoadingLeaderboard(true)
    try {
      const entries = await getDailyLeaderboard()
      setLeaderboard(entries)
    } finally {
      setLoadingLeaderboard(false)
    }
  }

  async function handleGuess(choice: string) {
    if (phase.name !== 'playing') return
    const { question } = phase
    const today = await getTodayDateString()

    const isCorrect =
      choice.toLowerCase() === `${question.firstName} ${question.lastName}`.toLowerCase()
    const result = isCorrect ? 'correct' : 'incorrect'

    // Persist locally
    setLocalAnswer(today, { result, questionId: String(question.id) })

    // Persist to Supabase if signed in (fire & forget)
    if (isSignedIn) {
      saveDailyChallengeScore({
        questionId: String(question.id),
        isCorrect,
      }).catch(console.error)
    }

    setPhase({ name: 'answered', result, question })
    if (isCorrect) {
      loadLeaderboard()
    }
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
    return (
      <AlreadyAnswered
        result={phase.result}
        question={phase.question}
        leaderboard={leaderboard}
        loadingLeaderboard={loadingLeaderboard}
      />
    )
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

  // answered
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
      <ResultBanner
        result={result}
        question={question}
        isSignedIn={!!isSignedIn}
        isLoaded={isLoaded}
        leaderboard={leaderboard}
        loadingLeaderboard={loadingLeaderboard}
      />
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
  leaderboard,
  loadingLeaderboard,
}: {
  result: 'correct' | 'incorrect'
  question: Question
  isSignedIn: boolean
  isLoaded: boolean
  leaderboard: LeaderboardEntry[]
  loadingLeaderboard: boolean
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

      {(result === 'correct' || leaderboard.length > 0) && (
        <LeaderboardPanel entries={leaderboard} loading={loadingLeaderboard} />
      )}
    </motion.div>
  )
}

function AlreadyAnswered({
  result,
  question,
  leaderboard,
  loadingLeaderboard,
}: {
  result: 'correct' | 'incorrect'
  question: Question
  leaderboard: LeaderboardEntry[]
  loadingLeaderboard: boolean
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

        {leaderboard.length > 0 && (
          <LeaderboardPanel entries={leaderboard} loading={loadingLeaderboard} />
        )}
      </motion.div>
    </div>
  )
}

function LeaderboardPanel({ entries, loading }: { entries: LeaderboardEntry[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="mt-4 border-t-2 border-black/30 pt-3">
        <p className="text-xs font-mono opacity-60 animate-pulse">Loading leaderboard...</p>
      </div>
    )
  }

  if (entries.length === 0) return null

  return (
    <div className="mt-4 border-t-2 border-black/30 pt-3 text-left">
      <p className="text-xs font-mono font-bold uppercase tracking-widest mb-2 opacity-80">
        Today&apos;s correct answers
      </p>
      <ol className="space-y-1">
        {entries.map((entry, i) => (
          <li key={entry.userId} className="flex items-center gap-2 text-xs font-mono">
            <span className="font-bold opacity-60 w-4 text-right">{i + 1}.</span>
            <span className="font-bold">{entry.displayName}</span>
            <span className="opacity-50 ml-auto">
              {new Date(entry.answeredAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'UTC',
                timeZoneName: 'short',
              })}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
