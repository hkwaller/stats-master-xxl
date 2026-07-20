'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { nanoid } from 'nanoid'
import { SignInButton, useAuth, UserButton } from '@clerk/nextjs'
import { Button } from '@/components/design-system'
import { CBrand } from '@/components/arcade'
import { AdsterraBanner } from '@/components/ads/AdsterraBanner'
import { DailyChallenge } from '@/components/game/DailyChallenge'

const FEATURES = [
  {
    emoji: '🏒',
    title: 'Stat Blitz',
    desc: 'Five stats, four names, twelve seconds. Go.',
    color: '#e32437',
  },
  {
    emoji: '🔥',
    title: 'Streak Combos',
    desc: 'Answer fast, rack up a combo, earn foil bonuses.',
    color: '#ffcf33',
  },
  {
    emoji: '⚡',
    title: 'Power Plays',
    desc: 'Random 2× windows that flip the leaderboard.',
    color: '#003087',
  },
  {
    emoji: '🚫',
    title: 'Penalty Box',
    desc: 'Wrong answer in boss mode? Sit two rounds out.',
    color: '#0a1535',
  },
]

export default function LandingPage() {
  const router = useRouter()
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const { isSignedIn, isLoaded } = useAuth()

  function handleCreate() {
    const roomId = nanoid(6).toUpperCase()
    router.push(`/${roomId}/setup`)
  }

  function handleJoin() {
    const code = joinCode.trim().toUpperCase()
    if (code.length < 4) {
      setError('Enter a valid room code')
      return
    }
    router.push(`/${code}/lobby`)
  }

  return (
    <main className="ice-bg min-h-screen flex flex-col pb-16 overflow-x-hidden">
      {/* ── Top nav ── */}
      <nav className="flex items-center justify-between px-5 py-4 md:px-9 md:py-[18px]">
        <CBrand />
        <div className="flex items-center gap-3">
          <div
            className="hidden md:inline-flex"
            style={{
              background: '#fff',
              border: '2px solid #0a1535',
              borderRadius: 9999,
              padding: '6px 14px',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 3px 0 rgba(10,21,53,0.15)',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                background: '#2cc66b',
                borderRadius: '50%',
                display: 'inline-block',
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-archivo-black), sans-serif',
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: '0.14em',
                color: '#0a1535',
              }}
            >
              MULTIPLAYER
            </span>
          </div>
          {isLoaded &&
            (isSignedIn ? (
              <UserButton />
            ) : (
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm">
                  SIGN IN
                </Button>
              </SignInButton>
            ))}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section
        style={{ position: 'relative', flex: 1 }}
        className="max-w-6xl mx-auto w-full px-5 pt-8 pb-12 md:px-10 md:pt-10 md:pb-[60px]"
      >
        <div className="grid items-center gap-8 md:gap-10 grid-cols-1 md:grid-cols-[1.2fr_1fr]">
          {/* Left: hero copy + actions */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="space-y-6"
          >
            {/* Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#e32437',
                color: '#fff',
                border: '2px solid #0a1535',
                borderRadius: 9999,
                padding: '8px 16px',
                fontFamily: 'var(--font-archivo-black), sans-serif',
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: '0.2em',
                boxShadow: '0 4px 0 #0a1535',
              }}
            >
              🏒 MULTIPLAYER · 2–8 PLAYERS
            </div>

            {/* H1 */}
            <h1
              style={{
                fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
                fontSize: 'clamp(40px, 11vw, 72px)',
                lineHeight: 0.9,
                color: '#0a1535',
                letterSpacing: '-0.01em',
                margin: 0,
              }}
            >
              <span style={{ color: '#003087' }}>FIVE</span> STATS.
              <br />
              <span style={{ color: '#e32437' }}>ONE</span> LEGEND.
              <br />
              <span
                style={{
                  display: 'inline-block',
                  transform: 'rotate(-2deg)',
                  background: '#ffcf33',
                  padding: '4px 16px',
                  border: '3px solid #0a1535',
                  borderRadius: 16,
                  boxShadow: '0 6px 0 #0a1535',
                  marginTop: 6,
                }}
              >
                GO!
              </span>
            </h1>

            <p
              style={{
                fontFamily: 'var(--font-body), "Space Grotesk", sans-serif',
                fontSize: 17,
                lineHeight: 1.5,
                color: '#0a1535',
                opacity: 0.8,
                maxWidth: 460,
                margin: '2em 0',
              }}
            >
              The couch-co-op hockey trivia game your group chat has been begging for. Buzz in,
              build streaks, dodge the penalty box.
            </p>

            {/* Create button */}
            <Button variant="primary" size="lg" onClick={handleCreate}>
              🎮 CREATE GAME
            </Button>

            {/* Join input */}
            <div className="flex gap-2" style={{ maxWidth: 360 }}>
              <input
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.toUpperCase())
                  setError('')
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                placeholder="ROOM CODE"
                maxLength={8}
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: '3px solid #0a1535',
                  borderRadius: 12,
                  padding: '14px 16px',
                  textAlign: 'center',
                  fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
                  fontSize: 18,
                  letterSpacing: '0.1em',
                  color: '#0a1535',
                  background: '#fff',
                  boxShadow: '0 5px 0 #0a1535',
                  outline: 'none',
                }}
                className="uppercase"
              />
              <Button variant="secondary" size="md" onClick={handleJoin}>
                JOIN
              </Button>
            </div>
            {error && <p style={{ color: '#e32437', fontSize: 14, fontWeight: 700 }}>{error}</p>}
          </motion.div>

          {/* Right: DailyChallenge */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="min-w-0"
          >
            <DailyChallenge />
          </motion.div>
        </div>
      </section>

      {/* ── Features strip ── */}
      <section
        style={{ borderTop: '2px dashed rgba(10,21,53,0.15)' }}
        className="px-5 pt-8 pb-2 md:px-10 md:pt-9"
      >
        <div className="max-w-6xl mx-auto grid gap-4 md:gap-5 grid-cols-2 md:grid-cols-4">
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200 }}
              style={{
                background: '#fff',
                border: '2px solid #0a1535',
                borderRadius: 14,
                padding: 18,
                boxShadow: '0 4px 0 rgba(10,21,53,0.2)',
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  background: f.color,
                  borderRadius: 10,
                  border: '2px solid #0a1535',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 17,
                  marginBottom: 12,
                }}
              >
                {f.emoji}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
                  fontSize: 13,
                  color: '#0a1535',
                  marginBottom: 6,
                }}
              >
                {f.title}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-body), "Space Grotesk", sans-serif',
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: '#6b7ea0',
                }}
              >
                {f.desc}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="px-6 py-4 max-w-6xl mx-auto w-full">
        <AdsterraBanner slot="landing" />
      </div>
    </main>
  )
}
