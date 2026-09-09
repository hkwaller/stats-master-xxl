'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { nanoid } from 'nanoid'
import { Play } from 'lucide-react'
import { SignInButton, useAuth, UserButton } from '@clerk/nextjs'
import { Button, Kickplate, MonoLabel } from '@/components/design-system'
import { PuckMark, Jumbotron, FaceoffCircle, type JumboCell } from '@/components/arcade'
import { AnswerRow } from '@/components/game/AnswerRow'
import { AdsterraBanner } from '@/components/ads/AdsterraBanner'
import { DailyChallenge } from '@/components/game/DailyChallenge'

const INK = '#0d1b2a'
const RED = '#cf0a2c'

// A real 1987–88 line, used as the hero's demo board.
const HERO_CELLS: JumboCell[] = [
  { abbr: 'GP', value: '80' },
  { abbr: 'G', value: '52' },
  { abbr: 'A', value: '87' },
  { abbr: 'PTS', value: '139', emphasis: true },
  { abbr: 'PIM', value: '46' },
]

const HERO_CHOICES = [
  { letter: 'A', name: 'Jari Kurri' },
  { letter: 'B', name: 'Mike Bossy' },
  { letter: 'C', name: 'Peter Stastny' },
  { letter: 'D', name: 'Denis Savard' },
]

const HERO_STATS = [
  { value: '46,704', label: 'Real seasons' },
  { value: '7,745', label: 'Skaters' },
  { value: '2–8', label: 'Players per room' },
]

const STEPS = [
  {
    num: '01',
    title: 'Open a room',
    desc: 'Pick a mode, difficulty tiers and era range. Takes about twenty seconds.',
  },
  {
    num: '02',
    title: 'Put it on the TV',
    desc: 'The board goes on the big screen. Everyone scans the code and their phone becomes a buzzer.',
  },
  {
    num: '03',
    title: 'Read the line',
    desc: 'Five stats light up one column at a time. Answer early, score higher — speed is worth up to 50 points.',
  },
  {
    num: '04',
    title: 'Settle it',
    desc: 'Streaks multiply, power plays double the round, and a wrong answer in boss mode costs you two rounds.',
  },
]

const MODES = [
  {
    label: 'Classic',
    tag: 'Most played',
    edge: RED,
    desc: 'One season stat line. Four names, or type it blind for more points.',
  },
  {
    label: 'Career',
    tag: 'Buzz in',
    edge: '#0b53c9',
    desc: 'Seasons reveal one by one. First to buzz gets the shot — and the lockout if they miss.',
  },
  {
    label: 'Head-to-Head',
    tag: 'Two lines',
    edge: INK,
    desc: 'Two stat lines, one name. Which column belongs to the skater on the board?',
  },
  {
    label: 'Higher / Lower',
    tag: 'Fast',
    edge: '#f2b21c',
    desc: 'Did they finish above or below the reference line? Pick a stat and go.',
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
    <main className="flex min-h-screen flex-col overflow-x-hidden" style={{ background: '#eef3f9' }}>
      {/* ── Nav ── */}
      <nav
        className="flex h-[66px] items-center justify-between px-5 md:px-[34px]"
        style={{ background: '#fff', boxShadow: '0 1px 0 rgba(13,27,42,0.10)' }}
      >
        <div className="flex items-center gap-[11px]">
          <PuckMark size={28} />
          <span
            className="font-display"
            style={{ fontWeight: 800, fontSize: 20, letterSpacing: '0.02em' }}
          >
            STATS MASTER
          </span>
        </div>

        <div className="flex items-center gap-4 md:gap-[26px]">
          <a href="#modes" className="hidden md:inline">
            <MonoLabel size={10} tracking="0.18em">Modes</MonoLabel>
          </a>
          <a href="#how" className="hidden md:inline">
            <MonoLabel size={10} tracking="0.18em">How it works</MonoLabel>
          </a>
          <span className="hidden items-center gap-[7px] sm:flex">
            <span className="size-[7px] rounded-full" style={{ background: RED }} />
            <MonoLabel size={10} tracking="0.16em">Multiplayer · free</MonoLabel>
          </span>
          {isLoaded &&
            (isSignedIn ? (
              <UserButton />
            ) : (
              <SignInButton mode="modal">
                <Button variant="secondary" size="sm">
                  Sign in
                </Button>
              </SignInButton>
            ))}
        </div>
      </nav>
      <Kickplate />

      {/* ── Hero ── */}
      <section
        className="ice-bg relative px-5 pt-12 pb-14 md:px-[34px] md:pt-16 md:pb-[58px]"
        style={{ overflow: 'hidden' }}
      >
        <FaceoffCircle
          size={620}
          color="rgba(207,10,44,0.10)"
          style={{ left: -180, top: -120 }}
        />
        <FaceoffCircle
          size={560}
          color="rgba(11,83,201,0.10)"
          style={{ right: -140, bottom: -260 }}
        />

        <div className="relative z-[2] mx-auto grid max-w-[1180px] items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-[52px]">
          {/* Left — the pitch */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="flex min-w-0 flex-col gap-6"
          >
            <span
              className="font-mono self-start"
              style={{
                fontSize: 10,
                letterSpacing: '0.26em',
                color: '#fff',
                background: INK,
                padding: '7px 12px',
              }}
            >
              MULTIPLAYER · 2–8 PLAYERS · FREE
            </span>

            <h1
              className="font-display m-0 text-[clamp(44px,9vw,84px)] xl:whitespace-nowrap"
              style={{ fontWeight: 800, lineHeight: 0.86, letterSpacing: '-0.005em' }}
            >
              FIVE STATS.
              <br />
              ONE LEGEND.
              <br />
              <span style={{ color: RED }}>TWELVE SECONDS.</span>
            </h1>

            <p
              className="m-0 max-w-[480px]"
              style={{ fontSize: 16, lineHeight: 1.6, color: '#55677d' }}
            >
              One screen shows the board. Everyone else plays on their phone. Guess the NHL skater
              from a season stat line before the room beats you to it — 46,704 real seasons, 1917 to
              2025.
            </p>

            <div className="flex flex-wrap items-stretch gap-3">
              <Button variant="primary" size="lg" onClick={handleCreate}>
                <Play size={16} strokeWidth={2.2} />
                Create a game
              </Button>

              <div
                className="flex min-w-0"
                style={{ background: '#fff', boxShadow: 'inset 0 0 0 2px rgba(13,27,42,0.14)' }}
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
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 20,
                    letterSpacing: '0.18em',
                    color: INK,
                  }}
                />
                <button
                  onClick={handleJoin}
                  className="btn-ice font-display shrink-0"
                  style={{
                    background: INK,
                    border: 'none',
                    color: '#fff',
                    padding: '0 26px',
                    fontWeight: 700,
                    fontSize: 17,
                    letterSpacing: '0.14em',
                    cursor: 'pointer',
                  }}
                >
                  JOIN
                </button>
              </div>
            </div>

            {error && (
              <p className="m-0" style={{ color: RED, fontSize: 13, fontWeight: 600 }}>
                {error}
              </p>
            )}

            <div className="flex flex-wrap gap-[30px] pt-1.5">
              {HERO_STATS.map((s) => (
                <div
                  key={s.label}
                  className="flex flex-col gap-1.5 pl-3"
                  style={{ borderLeft: '4px solid rgba(11,83,201,0.5)' }}
                >
                  <span
                    className="font-display tabular-nums"
                    style={{ fontWeight: 800, fontSize: 34, lineHeight: 1 }}
                  >
                    {s.value}
                  </span>
                  <MonoLabel size={9} tracking="0.2em">{s.label}</MonoLabel>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right — the board, hanging from the rafters */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.4, ease: 'easeOut' }}
            className="flex min-w-0 flex-col gap-3.5 pt-10 lg:pt-0"
            aria-hidden="true"
          >
            <Jumbotron
              cells={HERO_CELLS}
              size="hero"
              topLeft="1987–88"
              topRight="EDMONTON"
            />
            <div className="grid gap-2.5 sm:grid-cols-2">
              {HERO_CHOICES.map((c, i) => (
                <AnswerRow
                  key={c.letter}
                  letter={c.letter}
                  name={c.name}
                  state={i === 3 ? 'correct' : 'default'}
                  variant="phone"
                />
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── How a game runs ── */}
      <section
        id="how"
        className="px-5 py-[54px] md:px-[34px]"
        style={{ background: '#fff', borderTop: `5px solid ${INK}` }}
      >
        <div className="mx-auto flex max-w-[1180px] flex-col gap-8">
          <div className="flex flex-wrap items-baseline justify-between gap-5">
            <h2
              className="font-display m-0"
              style={{ fontWeight: 800, fontSize: 'clamp(34px,6vw,50px)', lineHeight: 1 }}
            >
              HOW A GAME RUNS
            </h2>
            <MonoLabel size={10} tracking="0.2em">Roughly 6 minutes for 10 questions</MonoLabel>
          </div>

          <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div
                key={s.num}
                className="flex flex-col gap-3 pt-4"
                style={{ borderTop: `5px solid ${RED}` }}
              >
                <span
                  className="font-display tabular-nums"
                  style={{ fontWeight: 800, fontSize: 34, lineHeight: 1, color: RED }}
                >
                  {s.num}
                </span>
                <span
                  className="font-display"
                  style={{
                    fontWeight: 700,
                    fontSize: 28,
                    lineHeight: 1.02,
                    textTransform: 'uppercase',
                  }}
                >
                  {s.title}
                </span>
                <span style={{ fontSize: 13, lineHeight: 1.6, color: '#55677d' }}>{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Four ways to play ── */}
      <section id="modes" className="px-5 py-[54px] md:px-[34px]" style={{ background: '#eef3f9' }}>
        <div className="mx-auto flex max-w-[1180px] flex-col gap-[30px]">
          <h2
            className="font-display m-0"
            style={{ fontWeight: 800, fontSize: 'clamp(34px,6vw,50px)', lineHeight: 1 }}
          >
            FOUR WAYS TO PLAY
          </h2>

          <div className="grid gap-3.5 md:grid-cols-2">
            {MODES.map((m) => (
              <div
                key={m.label}
                className="on-ice flex flex-col gap-2 p-6"
                style={{ borderLeft: `6px solid ${m.edge}` }}
              >
                <div className="flex flex-wrap items-baseline gap-2.5">
                  <span
                    className="font-display"
                    style={{
                      fontWeight: 800,
                      fontSize: 30,
                      lineHeight: 1,
                      textTransform: 'uppercase',
                    }}
                  >
                    {m.label}
                  </span>
                  <MonoLabel size={9} tracking="0.16em">{m.tag}</MonoLabel>
                </div>
                <span style={{ fontSize: 13, lineHeight: 1.6, color: '#55677d' }}>{m.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Daily challenge ── */}
      <section
        className="px-5 py-[54px] md:px-[34px]"
        style={{ background: '#fff', borderTop: '1px solid rgba(13,27,42,0.10)' }}
      >
        <div className="mx-auto grid max-w-[1180px] items-start gap-11 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col gap-[18px] lg:sticky lg:top-8">
            <MonoLabel size={10} tracking="0.26em" color={RED}>Today&apos;s skater</MonoLabel>
            <h2
              className="font-display m-0"
              style={{ fontWeight: 800, fontSize: 'clamp(34px,6vw,50px)', lineHeight: 1 }}
            >
              ONE FREE GUESS,
              <br />
              EVERY DAY
            </h2>
            <p className="m-0" style={{ fontSize: 14, lineHeight: 1.65, color: '#55677d' }}>
              A single stat line, one shot, no room needed. Same skater for everyone in the world
              until midnight.
            </p>
          </div>

          <div className="min-w-0">
            <DailyChallenge />
          </div>
        </div>
      </section>

      {/* ── Drop the puck ── */}
      <section
        className="relative overflow-hidden px-5 py-[72px] text-center md:px-[34px]"
        style={{ background: INK, color: '#fff' }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ border: '6px solid rgba(255,255,255,0.06)' }}
        />
        <h2
          className="font-display relative m-0 mb-4"
          style={{ fontWeight: 800, fontSize: 'clamp(42px,9vw,72px)', lineHeight: 0.95 }}
        >
          DROP THE PUCK
        </h2>
        <p
          className="relative mx-auto mb-7 max-w-[440px]"
          style={{ fontSize: 15, lineHeight: 1.6, color: '#a9b7c7' }}
        >
          No account, no install. Open a room, throw the code on the TV, and let the group chat sort
          itself out.
        </p>
        <div className="relative inline-flex">
          <Button variant="primary" size="lg" onClick={handleCreate}>
            Create a game
          </Button>
        </div>
      </section>

      <div className="px-5 py-6 md:px-[34px]" style={{ background: '#eef3f9' }}>
        <div className="mx-auto max-w-[1180px]">
          <AdsterraBanner slot="landing" />
        </div>
      </div>

      {/* ── Footer ── */}
      <footer
        className="flex flex-wrap items-center justify-between gap-5 px-5 py-6 md:px-[34px]"
        style={{ background: INK }}
      >
        <MonoLabel size={9} tracking="0.16em">Stats Master · Amalies Utviklingsfabrikk</MonoLabel>
        <MonoLabel size={9} tracking="0.16em">
          Season data 1917–2025 · Not affiliated with any league
        </MonoLabel>
      </footer>
    </main>
  )
}
