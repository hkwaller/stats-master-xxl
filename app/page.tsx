'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { nanoid } from 'nanoid'
import { Play } from 'lucide-react'
import { SignInButton, useAuth, UserButton } from '@clerk/nextjs'
import { Button, MonoLabel } from '@/components/design-system'
import { PuckMark } from '@/components/arcade'
import { Jersey } from '@/components/game/Jersey'
import { DailyChallenge } from '@/components/game/DailyChallenge'

const INK = 'var(--color-ink)'

const HERO_STATS = [
  { value: '46,704', label: 'Real seasons' },
  { value: '7,745', label: 'Skaters' },
  { value: '2–8', label: 'Players per room' },
]

const STEPS = [
  {
    num: '01',
    title: 'Open a room',
    desc: 'Choose Classic, Career, Head-to-Head or Higher / Lower, then adjust the game settings.',
  },
  {
    num: '02',
    title: 'Put it on the TV',
    desc: 'Share the board on a big screen. Friends scan the QR code and pick a sweater on their phones.',
  },
  {
    num: '03',
    title: 'Name the card',
    desc: 'Identify a skater, follow a career, match a stat line or call higher or lower. Every mode plays differently.',
  },
  {
    num: '04',
    title: 'Chase the lead',
    desc: 'Score points, climb the binder and see who stands on top of the podium at the final whistle.',
  },
]

const MODES = [
  {
    label: 'Classic',
    tag: 'Most played',
    band: 'var(--color-cobalt)',
    bandText: '#ffffff',
    desc: 'One season on the back of a card. Choose from four names or type your answer.',
  },
  {
    label: 'Career',
    tag: 'Buzz in',
    band: 'var(--color-tangerine)',
    bandText: INK,
    desc: 'Seasons deal out one by one. First to buzz gets the shot - and the penalty box if they miss.',
  },
  {
    label: 'Head-to-Head',
    tag: 'Two lines',
    band: 'var(--color-mint)',
    bandText: INK,
    desc: 'Two card backs, one name. Which stat line belongs to the skater on the board?',
  },
  {
    label: 'Higher / Lower',
    tag: 'Fast',
    band: 'var(--color-lemon)',
    bandText: INK,
    desc: 'Did they finish above or below the reference card? Pick a stat and go.',
  },
]

const HERO_JERSEYS = [
  { jersey: { pattern: 'hoops', body: '#FF7A1A', trim: '#FFFFFF', number: 9 }, name: 'Mia', tilt: -10, y: 18 },
  { jersey: { pattern: 'yoke', body: '#2BC48A', trim: '#FFFFFF', number: 19 }, name: 'Jonas', tilt: 4, y: 0 },
  { jersey: { pattern: 'sleeves', body: '#FFD84D', trim: '#14213D', number: 87 }, name: 'Erik', tilt: 12, y: 22 },
] as const

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
    <main className="flex min-h-screen flex-col overflow-x-hidden" style={{ background: 'var(--color-ice-1)' }}>
      {/* ── Nav ── */}
      <nav className="relative z-20 flex h-[72px] items-center justify-between px-5 md:px-10">
        <div className="flex items-center gap-2.5">
          <PuckMark size={30} />
          <span className="font-display" style={{ fontSize: 28, lineHeight: 1, letterSpacing: '0.02em' }}>
            STATS MASTER
          </span>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          <a href="#modes" className="hidden md:inline">
            <MonoLabel color={INK}>Modes</MonoLabel>
          </a>
          <a href="#how" className="hidden md:inline">
            <MonoLabel color={INK}>How it works</MonoLabel>
          </a>
          {isLoaded &&
            (isSignedIn ? (
              <UserButton />
            ) : (
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </SignInButton>
            ))}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="ice-bg relative px-5 pt-6 pb-16 md:px-10 md:pt-10" style={{ overflow: 'hidden' }}>
        <div className="relative z-[2] mx-auto grid max-w-[1180px] items-center gap-12 min-[1100px]:grid-cols-[1fr_1fr]">
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="flex min-w-0 flex-col gap-6"
          >
            <div aria-hidden="true" className="flex items-end gap-1 pl-2">
              {HERO_JERSEYS.map((j) => (
                <div key={j.name} style={{ transform: `rotate(${j.tilt}deg) translateY(${j.y}px)` }}>
                  <Jersey jersey={j.jersey} name={j.name} size={96} decorative />
                </div>
              ))}
            </div>

            <h1 className="font-display m-0 text-[clamp(48px,6.6vw,86px)]" style={{ lineHeight: 0.92 }}>
              KNOW HOCKEY.
              <br />
              PICK YOUR SWEATER.
              <br />
              <span
                className="inline-block"
                style={{
                  background: 'var(--color-lemon)',
                  border: `4px solid ${INK}`,
                  borderRadius: 14,
                  padding: '0 14px',
                  marginTop: 8,
                  transform: 'rotate(-2deg)',
                }}
              >
                NAME THE CARD.
              </span>
            </h1>

            <p className="m-0 max-w-[500px]" style={{ fontSize: 17, lineHeight: 1.6, color: 'var(--color-ink-2)' }}>
              A trivia game played with real NHL stat lines from 1917 to 2025. Put the board on a
              big screen, everyone plays on their phones in their own sweater, or try the daily
              challenge solo.
            </p>

            <div className="hero-actions flex flex-wrap items-stretch gap-3">
              <Button variant="primary" size="lg" onClick={handleCreate}>
                <Play size={18} strokeWidth={2.4} />
                Create a game
              </Button>

              <div
                className="flex min-w-0 overflow-hidden"
                style={{ background: '#fff', border: `3px solid ${INK}`, borderRadius: 999 }}
              >
                <input
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value.toUpperCase())
                    setError('')
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  placeholder="ROOM CODE"
                  maxLength={8}
                  aria-label="Room code"
                  className="min-w-0 flex-1 focus:outline-none"
                  style={{
                    width: 168,
                    border: 'none',
                    background: 'transparent',
                    padding: '0 20px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: 18,
                    letterSpacing: '0.12em',
                    color: INK,
                  }}
                />
                <button
                  onClick={handleJoin}
                  className="font-display shrink-0"
                  style={{
                    background: INK,
                    border: 'none',
                    color: '#fff',
                    padding: '0 26px',
                    fontSize: 20,
                    letterSpacing: '0.03em',
                    cursor: 'pointer',
                  }}
                >
                  JOIN
                </button>
              </div>
            </div>

            {error && (
              <p className="m-0" role="alert" style={{ color: 'var(--color-alarm)', fontSize: 14, fontWeight: 600 }}>
                {error}
              </p>
            )}

            <dl className="m-0 grid max-w-[520px] grid-cols-3 gap-3">
              {HERO_STATS.map((s) => (
                <div
                  key={s.label}
                  className="flex flex-col gap-1 px-3 py-2.5"
                  style={{ background: '#fff', border: `2.5px solid ${INK}`, borderRadius: 14 }}
                >
                  <dd className="font-mono m-0 tabular-nums" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.1 }}>
                    {s.value}
                  </dd>
                  <dt className="font-mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-ink-2)', textTransform: 'uppercase' }}>
                    {s.label}
                  </dt>
                </div>
              ))}
            </dl>
          </motion.div>

          {/* Right - today's challenge */}
          <motion.div
            id="daily-challenge"
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.4, ease: 'easeOut' }}
            className="flex min-w-0 flex-col gap-3.5"
          >
            <DailyChallenge />
            <p className="m-0" style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-ink-2)' }}>
              Same card for everyone. New challenge at midnight UTC. No room needed.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── How a game runs ── */}
      <section id="how" className="px-5 py-16 md:px-10" style={{ background: '#fff', borderTop: `3px solid ${INK}` }}>
        <div className="mx-auto flex max-w-[1180px] flex-col gap-8">
          <div className="flex flex-wrap items-baseline justify-between gap-5">
            <h2 className="font-display m-0" style={{ fontSize: 'clamp(38px,6vw,56px)', lineHeight: 1 }}>
              HOW A GAME RUNS
            </h2>
            <MonoLabel>Choose your mode, era and pace</MonoLabel>
          </div>

          <ol className="m-0 grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li
                key={s.num}
                className="flex flex-col gap-3 p-5"
                style={{
                  background: 'var(--color-ice-1)',
                  border: `3px solid ${INK}`,
                  borderRadius: 16,
                  boxShadow: `4px 4px 0 ${INK}`,
                  transform: `rotate(${i % 2 ? 1 : -1}deg)`,
                }}
              >
                <span
                  className="font-mono self-start"
                  style={{
                    background: 'var(--color-lemon)',
                    border: `2px solid ${INK}`,
                    borderRadius: 6,
                    padding: '2px 8px',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {s.num}
                </span>
                <span className="font-display" style={{ fontSize: 30, lineHeight: 1, textTransform: 'uppercase' }}>
                  {s.title}
                </span>
                <span style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-ink-2)' }}>{s.desc}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Four ways to play ── */}
      <section id="modes" className="ice-bg relative px-5 py-16 md:px-10">
        <div className="relative z-[2] mx-auto flex max-w-[1180px] flex-col gap-8">
          <h2 className="font-display m-0" style={{ fontSize: 'clamp(38px,6vw,56px)', lineHeight: 1 }}>
            FOUR WAYS TO PLAY
          </h2>

          <div className="grid gap-5 md:grid-cols-2">
            {MODES.map((m) => (
              <div
                key={m.label}
                className="flex flex-col gap-3 p-3"
                style={{ background: '#fff', border: `3px solid ${INK}`, borderRadius: 18, boxShadow: `6px 6px 0 ${INK}` }}
              >
                <div
                  className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2.5"
                  style={{ background: m.band, color: m.bandText, borderRadius: 10 }}
                >
                  <span className="font-display" style={{ fontSize: 32, lineHeight: 1, textTransform: 'uppercase' }}>
                    {m.label}
                  </span>
                  <span className="font-mono" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>
                    {m.tag}
                  </span>
                </div>
                <span className="px-2 pb-1" style={{ fontSize: 15, lineHeight: 1.6 }}>
                  {m.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Deal the first card ── */}
      <section className="px-5 py-16 md:px-10" style={{ background: '#fff', borderTop: `3px solid ${INK}` }}>
        <div
          className="mx-auto flex max-w-[760px] flex-col items-center gap-5 px-6 py-12 text-center"
          style={{ background: 'var(--color-ice-1)', border: `3px solid ${INK}`, borderRadius: 24, boxShadow: `8px 8px 0 ${INK}` }}
        >
          <h2 className="font-display m-0" style={{ fontSize: 'clamp(44px,8vw,76px)', lineHeight: 0.95 }}>
            DEAL THE FIRST CARD
          </h2>
          <p className="m-0 max-w-[460px]" style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--color-ink-2)' }}>
            No account, no install. Open a room, throw the code on the TV, and let everyone pick a
            sweater.
          </p>
          <Button variant="primary" size="lg" onClick={handleCreate}>
            Create a game
          </Button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="flex flex-wrap items-center justify-between gap-5 px-5 py-6 md:px-10"
        style={{ background: '#fff', borderTop: `3px solid ${INK}` }}
      >
        <MonoLabel>Stats Master · Amalies Utviklingsfabrikk</MonoLabel>
        <MonoLabel>Season data 1917–2025 · Not affiliated with any league</MonoLabel>
        <nav aria-label="Legal and Playam" style={{ fontSize: 14 }}>
          <a href="/privacy" style={{ color: INK, textDecoration: 'underline' }}>
            Privacy
          </a>{' '}
          ·{' '}
          <a href="/terms" style={{ color: INK, textDecoration: 'underline' }}>
            Terms
          </a>{' '}
          ·{' '}
          <a href="https://playam.app" style={{ color: INK, textDecoration: 'underline' }}>
            A game from Playam
          </a>
        </nav>
      </footer>
    </main>
  )
}
