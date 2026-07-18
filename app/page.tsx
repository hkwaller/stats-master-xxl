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
    <main className="ice-bg min-h-screen flex flex-col pb-16">
      {/* ── Top nav ── */}
      <nav style={{ padding: '18px 36px' }} className="flex items-center justify-between">
        <CBrand />
        <div className="flex items-center gap-3">
          <div
            style={{
              background: '#fff',
              border: '2px solid #0a1535',
              borderRadius: 9999,
              padding: '6px 14px',
              display: 'inline-flex',
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
        style={{ padding: '40px 40px 60px', position: 'relative', flex: 1 }}
        className="max-w-6xl mx-auto w-full"
      >
        <div className="grid items-center gap-10" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
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
                fontSize: 'clamp(44px, 6vw, 72px)',
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
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <DailyChallenge />
          </motion.div>
        </div>
      </section>

      {/* ── Features strip ── */}
      <section
        style={{
          borderTop: '2px dashed rgba(10,21,53,0.15)',
          padding: '36px 40px 8px',
        }}
      >
        <div
          className="max-w-6xl mx-auto grid gap-5"
          style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}
        >
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
