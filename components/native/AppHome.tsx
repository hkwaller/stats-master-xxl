'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { nanoid } from 'nanoid'
import { ArrowRight, Plus, Users, WifiOff } from 'lucide-react'
import { SignInButton, UserButton, useAuth } from '@clerk/nextjs'
import { PuckMark } from '@/components/arcade/Brand'
import { RinkBg } from '@/components/arcade/RinkBg'
import { Button, Kickplate } from '@/components/design-system'
import { DailyChallenge } from '@/components/game/DailyChallenge'
import { nativeFeedback } from '@/lib/native'

export function AppHome() {
  const router = useRouter()
  const { isLoaded, isSignedIn } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [daily, setDaily] = useState(false)
  function host() {
    void nativeFeedback()
    router.push(`/${nanoid(6).toUpperCase()}/setup`)
  }
  function join(event: React.FormEvent) {
    event.preventDefault()
    const room = code.trim().toUpperCase()
    if (!/^[A-Z0-9_-]{4,12}$/.test(room)) {
      setError('Enter the room code shown on the host’s screen.')
      return
    }
    void nativeFeedback('lock')
    router.push(`/${room}/lobby`)
  }
  return (
    <main className="app-home ice-bg relative min-h-dvh overflow-x-hidden">
      <RinkBg intensity={0.65} />
      <header className="app-home-header on-ice-header relative z-[2]">
        <Link href="/app" className="flex items-center gap-3" aria-label="Stats Master home"><PuckMark /><span className="font-display text-2xl font-extrabold">STATS MASTER</span></Link>
        {isLoaded && (isSignedIn ? <UserButton /> : <SignInButton mode="modal"><button className="app-text-action">Sign in</button></SignInButton>)}
      </header>
      <div className="relative z-[2]"><Kickplate /></div>
      <div className="app-home-content relative z-[2] mx-auto w-full max-w-3xl">
        <h1 className="font-display text-6xl leading-none font-extrabold uppercase sm:text-7xl">Game on.</h1>
        <p className="mt-3 max-w-md text-ink-2">Your rink. Your rivals. Who knows hockey?</p>
        <section aria-labelledby="room-heading" className="on-ice mt-8 p-5 sm:p-7">
          <h2 id="room-heading" className="font-display text-3xl font-bold uppercase">Bring the team</h2>
          <p className="mt-2 mb-5 text-sm text-ink-2">2–8 players · Classic, Career, Head-to-Head or Higher / Lower</p>
          <Button className="w-full" onClick={host}><Plus size={20} />Host a game</Button>
          <form onSubmit={join} className="mt-7">
            <label htmlFor="room-code" className="mb-2 block text-sm font-semibold">Join a room</label>
            <div className="app-join-row">
              <input id="room-code" value={code} onChange={event => { setCode(event.target.value.toUpperCase()); setError('') }} placeholder="ROOM CODE" autoCapitalize="characters" autoCorrect="off" spellCheck={false} maxLength={12} aria-invalid={Boolean(error)} aria-describedby={error ? 'room-error' : undefined} />
              <Button type="submit" variant="secondary"><Users size={18} />Join</Button>
            </div>
            {error && <p id="room-error" role="alert" className="mt-3 text-sm text-red">{error}</p>}
          </form>
        </section>
        <section aria-labelledby="solo-heading" className="mt-9">
          <h2 id="solo-heading" className="font-display text-3xl font-bold uppercase">Take a solo shift</h2>
          <button className="app-mode-row mt-3" onClick={() => { void nativeFeedback(); setDaily(value => !value) }} aria-expanded={daily} aria-controls="app-daily">
            <span><strong>Daily challenge</strong><span>One stat line. One shot. New every day.</span></span><ArrowRight size={22} aria-hidden="true" />
          </button>
          {daily && <div id="app-daily" className="on-ice p-4"><DailyChallenge /></div>}
          <Link href="/app/practice" className="app-mode-row" onClick={() => { void nativeFeedback() }}>
            <span><strong>Classic practice</strong><span>Ten rounds. No account or connection needed.</span></span><WifiOff size={22} aria-hidden="true" />
          </Link>
        </section>
        <footer className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-ink-2"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="https://playam.app">Playam</a></footer>
      </div>
    </main>
  )
}
