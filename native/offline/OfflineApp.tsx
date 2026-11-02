import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
const ClassicPractice = lazy(() => import('../../components/native/ClassicPractice').then(module => ({ default: module.ClassicPractice })))
import { Button, Kickplate } from '../../components/design-system'
import { PuckMark } from '../../components/arcade/Brand'
import { hasNativePlugin } from '../../lib/native'
import identity from '../../native.config.json'
import './fonts/fonts.css'
import './offline.css'

// Written by the bundle script from the exact sync configuration.
declare global { interface Window { STATS_MASTER_URL?: string } }
const onlineUrl = window.STATS_MASTER_URL || `${identity.origin}/app`

function OfflineApp() {
  const [playing, setPlaying] = useState(false)
  const [status, setStatus] = useState('Rooms, accounts and the daily challenge need a connection. Classic practice is ready to play.')
  const [busy, setBusy] = useState(false)
  const checking = useRef(false)
  const lastCheck = useRef(0)
  const playingRef = useRef(false)

  async function retry(automatic = false) {
    // Never take a player away from an offline game, including on resume.
    if (checking.current || (automatic && (playingRef.current || Date.now() - lastCheck.current < 30000))) return
    checking.current = true; lastCheck.current = Date.now(); setBusy(true)
    setStatus('Checking the connection…')
    try {
      const response = await fetch(new URL('/api/health', onlineUrl), { cache: 'no-store', signal: AbortSignal.timeout(5000) })
      const result = await response.json()
      if (!response.ok || result.app !== 'stats-master' || result.status !== 'ok') throw new Error('Unhealthy server')
      if (!playingRef.current) window.location.assign(onlineUrl)
    } catch {
      setStatus('The rink is still out of reach. Try again, or play Classic practice while you wait.')
    } finally { checking.current = false; setBusy(false) }
  }
  useEffect(() => {
    const online = () => { void retry(true) }
    const visible = () => { if (document.visibilityState === 'visible') online() }
    window.addEventListener('online', online)
    document.addEventListener('visibilitychange', visible)
    let active = true
    let cleanup: (() => void) | undefined
    if (hasNativePlugin('App')) void import('@capacitor/app').then(async ({ App }) => {
      const listener = await App.addListener('appStateChange', ({ isActive }) => { if (isActive) online() })
      if (active) cleanup = () => { void listener.remove() }
      else void listener.remove()
    }).catch(() => {})
    return () => { active = false; cleanup?.(); window.removeEventListener('online', online); document.removeEventListener('visibilitychange', visible) }
  }, [])

  return <main className="min-h-dvh">
    <header className="app-home-header on-ice-header"><span className="flex items-center gap-3"><PuckMark /><span className="font-display text-2xl font-extrabold">STATS MASTER</span></span></header><Kickplate />
    <div className="app-home-content mx-auto max-w-xl">{playing ? <Suspense fallback={<p role="status">Getting the ice ready…</p>}><ClassicPractice onExit={() => { playingRef.current = false; setPlaying(false) }} /></Suspense> : <>
      <h1 className="font-display text-6xl leading-none font-extrabold uppercase">Off the grid.<br />Still on the ice.</h1>
      <p className="mt-5 mb-7 text-ink-2" role="status">{status}</p>
      <Button className="w-full" onClick={() => { playingRef.current = true; setPlaying(true) }}>Play Classic practice</Button>
      <Button className="mt-4 w-full" variant="secondary" disabled={busy} onClick={() => { void retry() }}>{busy ? 'Checking…' : 'Retry online game'}</Button>
      <p className="mt-8 text-sm text-ink-2">Practice runs entirely on this device. It does not submit daily scores or connect to multiplayer rooms.</p>
    </>}</div>
  </main>
}
createRoot(document.getElementById('root')!).render(<OfflineApp />)
