'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { nanoid } from 'nanoid'
import { ArrowRight, ChevronRight, Info, Plus, Trophy, Users, WifiOff } from 'lucide-react'
import { SignInButton, UserButton, useAuth } from '@clerk/nextjs'
import { PuckMark } from '@/components/arcade/Brand'
import { RinkBg } from '@/components/arcade/RinkBg'
import { AdPrivacyChoices } from './AdPrivacyChoices'
import { nativeFeedback } from '@/lib/native'

export function AppHome() {
  const router = useRouter()
  const { isLoaded, isSignedIn } = useAuth()
  const sheet = useRef<HTMLDialogElement>(null)
  const codeInput = useRef<HTMLInputElement>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState<'host' | 'join' | null>(null)
  const [isNavigating, startNavigation] = useTransition()

  function host() {
    if (isNavigating) return
    void nativeFeedback()
    startNavigation(() => {
      setPending('host')
      router.push(`/${nanoid(6).toUpperCase()}/setup`)
    })
  }

  function openJoin() {
    setError('')
    void nativeFeedback()
    sheet.current?.showModal()
    codeInput.current?.focus()
  }

  function join(event: React.FormEvent) {
    event.preventDefault()
    if (isNavigating) return
    const room = code.trim().toUpperCase()
    if (!/^[A-Z0-9_-]{4,12}$/.test(room)) {
      setError('Enter the 4–12 character code shown on the host’s screen.')
      void nativeFeedback('wrong')
      return
    }
    void nativeFeedback('lock')
    startNavigation(() => {
      setPending('join')
      router.push(`/${room}/lobby`)
    })
  }

  return (
    <main className="app-home ice-bg relative isolate overflow-x-hidden">
      <RinkBg intensity={0.28} />
      <header className="app-play-header relative z-[2]">
        <Link href="/app" className="app-play-brand" aria-label="Stats Master home">
          <PuckMark size={25} /><span>STATS MASTER</span>
        </Link>
        <div className="app-account">
          {!isLoaded ? <span className="app-account-placeholder" aria-label="Loading account" /> : isSignedIn ? <UserButton appearance={{ elements: { userButtonTrigger: { minWidth: 44, minHeight: 44, justifyContent: 'center' } } }} /> : (
            <SignInButton mode="modal"><button className="app-account-button">Sign in</button></SignInButton>
          )}
        </div>
      </header>

      <div className="app-play-content relative z-[2]">
        <h1 className="app-play-title">Play</h1>
        <section aria-labelledby="room-heading" className="app-multiplayer">
          <div className="app-section-heading">
            <h2 id="room-heading">With friends</h2>
            <span>2–8 players</span>
          </div>
          <div className="app-room-actions">
            <button className="app-host-action" onClick={host} disabled={isNavigating} aria-busy={isNavigating && pending === 'host'}>
              <span className="app-action-icon"><Plus size={26} aria-hidden="true" /></span>
              <span className="app-action-copy"><strong>{isNavigating && pending === 'host' ? 'Opening room…' : 'Host a game'}</strong><span>Choose a mode. Bring your team.</span></span>
              <ArrowRight size={22} aria-hidden="true" />
            </button>
            <button className="app-join-action" onClick={openJoin} disabled={isNavigating} aria-haspopup="dialog">
              <Users size={22} aria-hidden="true" /><strong>Join a game</strong><span>Enter room code</span><ChevronRight size={20} aria-hidden="true" />
            </button>
          </div>
          <p className="app-room-note">Classic · Career · Head-to-Head · Higher / Lower</p>
        </section>

        <section aria-labelledby="solo-heading" className="app-solo">
          <div className="app-section-heading"><h2 id="solo-heading">On your own</h2></div>
          <div className="app-solo-list">
            <Link href="/app/daily" className="app-play-row" onClick={() => { void nativeFeedback() }}>
              <span className="app-row-icon"><Trophy size={23} aria-hidden="true" /></span>
              <span className="app-row-copy"><strong>Daily challenge</strong><span>One stat line. One shot. Every day.</span></span>
              <ChevronRight size={20} aria-hidden="true" />
            </Link>
            <Link href="/app/practice" className="app-play-row" onClick={() => { void nativeFeedback() }}>
              <span className="app-row-icon"><WifiOff size={23} aria-hidden="true" /></span>
              <span className="app-row-copy"><strong>Classic practice</strong><span>Ten rounds. Play offline.</span></span>
              <ChevronRight size={20} aria-hidden="true" />
            </Link>
          </div>
        </section>

        <details className="app-about">
          <summary><Info size={17} aria-hidden="true" />About Stats Master<ChevronRight size={16} aria-hidden="true" /></summary>
          <p>A hockey trivia game from Playam.</p>
          <nav aria-label="About Stats Master"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="https://playam.app">Playam</a></nav>
          <AdPrivacyChoices />
        </details>
      </div>

      <dialog ref={sheet} className="app-join-sheet" aria-labelledby="join-title" aria-describedby="join-description" onClick={event => {
        if (event.target === event.currentTarget) sheet.current?.close()
      }}>
        <div className="app-sheet-content">
          <div className="app-sheet-heading"><h2 id="join-title">Join a game</h2><button onClick={() => sheet.current?.close()} className="app-sheet-cancel">Cancel</button></div>
          <p id="join-description">Enter the room code from your host’s screen.</p>
          <form onSubmit={join} className="app-sheet-form">
            <label htmlFor="room-code">Room code</label>
            <input ref={codeInput} id="room-code" value={code} onChange={event => { setCode(event.target.value.toUpperCase()); setError('') }} placeholder="e.g. ABC123" autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false} maxLength={12} enterKeyHint="go" aria-invalid={Boolean(error)} aria-describedby={error ? 'room-error' : 'join-description'} />
            {error && <p id="room-error" role="alert" className="app-join-error">{error}</p>}
            <button type="submit" className="app-sheet-submit" disabled={isNavigating} aria-busy={isNavigating && pending === 'join'}>{isNavigating && pending === 'join' ? 'Joining…' : 'Join game'}<ArrowRight size={20} aria-hidden="true" /></button>
          </form>
        </div>
      </dialog>
    </main>
  )
}
