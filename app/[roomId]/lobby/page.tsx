'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { nanoid } from 'nanoid'
import { QRCodeSVG } from 'qrcode.react'
import { useStorage } from '@/lib/liveblocks/client'
import { useAssignBoss, useJoinGame, useStartGame } from '@/lib/liveblocks/mutations'
import { getOrCreateGuest } from '@/lib/guest'
import { useAdFree } from '@/hooks/useAdFree'
import { Check, Copy, Settings } from 'lucide-react'
import { Avatar, Button, Kickplate, Modal, MonoLabel } from '@/components/design-system'
import { PuckMark, JumbotronPanel } from '@/components/arcade'
import { AdsterraBanner } from '@/components/ads/AdsterraBanner'
import type { CareerQuestion, H2HPair, HLPair, Question } from '@/types/game'

const INK = '#0d1b2a'
const RED = '#cf0a2c'
const DEAD = '#b3c0cf'

interface LobbyPageProps {
  params: Promise<{ roomId: string }>
}

export default function LobbyPage({ params }: LobbyPageProps) {
  const router = useRouter()
  const [roomId, setRoomId] = useState('')
  const [myId, setMyId] = useState('')
  const [connectUrl, setConnectUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [starting, setStarting] = useState(false)
  const [showBossModal, setShowBossModal] = useState(false)
  const [pendingBossId, setPendingBossId] = useState('')

  const game = useStorage((root) => root.game)
  const { adFree } = useAdFree()
  const joinGame = useJoinGame()
  const startGame = useStartGame()
  const assignBoss = useAssignBoss()
  const [hasJoined, setHasJoined] = useState(false)

  useEffect(() => {
    params.then(({ roomId }) => {
      setRoomId(roomId)
      const base = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      setConnectUrl(`${base}/${roomId}/connect`)
    })
  }, [params])

  useEffect(() => {
    if (!game || hasJoined) return
    const g = getOrCreateGuest()
    setMyId(g.id)
    const isHost = game.hostId === g.id || game.hostId === ''
    if (!isHost || game.hostPlays !== false) {
      joinGame({ id: g.id, name: g.name })
    }
    setHasJoined(true)
  }, [game, joinGame, hasJoined])

  useEffect(() => {
    if (!game || !roomId || !myId) return
    const isHost = game.hostId === myId
    if (isHost) return
    if (game.command === 'starting' || game.command === 'answering' || game.command === 'question') {
      router.push(`/${roomId}/player/${myId}`)
    }
  }, [game?.command, roomId, myId, router])

  function handleCopy() {
    navigator.clipboard.writeText(connectUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleAssignBoss(playerId: string | null) {
    assignBoss({ requesterId: myId, playerId })
  }

  async function handleStartGame() {
    if (!myId || starting) return
    const hostPlays = game?.hostPlays !== false
    const hasBoss = !!(game?.bossId)
    const playerList = (game?.players ?? []) as { id: string; name: string }[]
    if (!hostPlays && !hasBoss) {
      setPendingBossId(playerList[0]?.id ?? '')
      setShowBossModal(true)
      return
    }
    return doStartGame()
  }

  async function doStartGame() {
    setStarting(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const dailyKey = `nhl-played-${today}`
      const excludeIds: string[] = JSON.parse(localStorage.getItem(dailyKey) ?? '[]')

      const gameMode = game?.gameMode ?? 'classic'
      const tiers = game?.difficultyTiers ?? ['easy', 'medium']
      const eras = game?.eras ?? ['1970s', '1980s', '1990s', '2000s', '2010s', '2020s']
      const count = game?.questionCount ?? 10
      const bossToken = game?.bossToken || nanoid(12)

      let questionSequence: Question[] = []
      let careerData: CareerQuestion[] | undefined
      let h2hPairs: H2HPair[] | undefined
      let hlPairs: HLPair[] | undefined

      if (gameMode === 'classic') {
        const res = await fetch('/api/questions/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tiers, eras, count,
            answerMode: game?.answerMode ?? 'multiplechoice',
            excludeIds,
            rookiesOnly: game?.rookiesOnly ?? false,
          }),
        })
        const data = (await res.json()) as { questions: Question[] }
        questionSequence = data.questions
      } else if (gameMode === 'career') {
        const playedCareerKey = `nhl-career-played-${today}`
        const excludePlayerIds: number[] = JSON.parse(localStorage.getItem(playedCareerKey) ?? '[]')
        const res = await fetch('/api/questions/generate-career', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eras, count,
            minSeasons: game?.careerMinSeasons ?? 5,
            maxReveals: game?.careerMaxReveals ?? 8,
            revealOrder: game?.careerRevealOrder ?? 'best-first',
            excludePlayerIds,
            difficultyTiers: tiers,
          }),
        })
        const data = (await res.json()) as { questions: Question[]; careerData: CareerQuestion[] }
        questionSequence = data.questions
        careerData = data.careerData
      } else if (gameMode === 'h2h') {
        const res = await fetch('/api/questions/generate-h2h', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tiers, eras, count }),
        })
        const data = (await res.json()) as { questions: Question[]; pairs: H2HPair[] }
        questionSequence = data.questions
        h2hPairs = data.pairs
      } else if (gameMode === 'higher-lower') {
        const res = await fetch('/api/questions/generate-hl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tiers, eras, count, field: game?.hlComparisonField ?? 'points' }),
        })
        const data = (await res.json()) as { questions: Question[]; pairs: HLPair[] }
        questionSequence = data.questions
        hlPairs = data.pairs
      }

      startGame({ requesterId: myId, questionSequence, bossToken, gameMode, careerData, h2hPairs, hlPairs, hostAdFree: adFree })

      const hostPlays = game?.hostPlays !== false
      if (hostPlays) {
        router.push(`/${roomId}/player/${myId}`)
      } else {
        router.push(`/${roomId}/game`)
      }
    } catch {
      setStarting(false)
    }
  }

  const players = (game?.players ?? []) as {
    id: string; name: string; avatarUrl: string; score: number; isHost: boolean; isBoss: boolean
  }[]
  const isHost = game?.hostId === myId
  const canStart = players.length >= 1
  const maxPlayers = 8
  const modeName = {
    classic: 'Classic',
    career: 'Career',
    h2h: 'Head-to-Head',
    'higher-lower': 'Higher or Lower',
  }[game?.gameMode ?? 'classic'] ?? 'Classic'
  const configTiers = (game?.difficultyTiers as string[] | undefined) ?? []
  const configSummary = [
    modeName.toUpperCase(),
    `${game?.questionCount ?? 10} QUESTIONS`,
    configTiers.length ? configTiers.map((t) => t.toUpperCase()).join(' + ') : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const openSeats = Math.max(0, maxPlayers - players.length)

  return (
    <main className="ice-bg relative flex min-h-screen flex-col overflow-x-hidden">
      {/* ── Header ── */}
      <header className="on-ice-header relative z-20">
        <div className="flex h-[60px] items-center justify-between px-5 md:px-8">
          <div className="flex items-center gap-[11px]">
            <PuckMark size={26} />
            <span
              className="font-display"
              style={{ fontWeight: 800, fontSize: 18, letterSpacing: '0.02em' }}
            >
              STATS MASTER
            </span>
          </div>
          <div className="flex items-center gap-4">
            <MonoLabel size={9} tracking="0.22em">
              {players.length} / {maxPlayers} seated
            </MonoLabel>
            <span className="flex items-center gap-[7px]">
              <span className="size-[7px] animate-pulse rounded-full" style={{ background: RED }} />
              <MonoLabel size={9} tracking="0.16em">Live</MonoLabel>
            </span>
          </div>
        </div>
        <Kickplate />
      </header>

      <div className="relative z-[2] mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-5 pt-8 pb-[132px] md:px-8">
        {/* ── Title ── */}
        <div className="flex flex-col gap-2">
          <MonoLabel size={10} tracking="0.3em">Step 2 of 2 · {configSummary}</MonoLabel>
          <h1
            className="font-display m-0"
            style={{
              fontWeight: 800,
              fontSize: 'clamp(38px,7vw,60px)',
              lineHeight: 0.9,
              letterSpacing: '0.005em',
              textTransform: 'uppercase',
            }}
          >
            Warm-up
          </h1>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          {/* ── Room code, on the jumbotron ── */}
          <div className="flex flex-col gap-5">
            <JumbotronPanel struts screenPad="20px 22px">
              <div className="flex flex-col gap-3">
                <span
                  className="font-mono"
                  style={{ fontSize: 10, letterSpacing: '0.3em', color: 'rgba(255,176,31,0.65)' }}
                >
                  ROOM CODE
                </span>
                <span
                  className="led-glow tabular-nums"
                  style={{
                    fontFamily: 'var(--font-led)',
                    fontWeight: 700,
                    fontSize: 'clamp(52px,11vw,84px)',
                    lineHeight: 0.82,
                    letterSpacing: '0.1em',
                    color: '#ffb01f',
                  }}
                >
                  {roomId || '—'}
                </span>
              </div>
            </JumbotronPanel>

            <div className="on-ice flex flex-col gap-4 p-5">
              <MonoLabel size={10} tracking="0.22em">Scan to join</MonoLabel>

              <div className="flex items-center gap-5">
                {connectUrl && (
                  <div className="shrink-0 bg-white p-2" style={{ boxShadow: 'inset 0 0 0 1px rgba(13,27,42,0.14)' }}>
                    <QRCodeSVG value={connectUrl} size={116} bgColor="#ffffff" fgColor={INK} level="M" />
                  </div>
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <span
                    className="font-mono break-all"
                    style={{ fontSize: 10, letterSpacing: '0.08em', color: '#55677d', lineHeight: 1.6 }}
                  >
                    {connectUrl}
                  </span>
                  <Button variant="secondary" size="sm" onClick={handleCopy}>
                    {copied ? <Check size={14} strokeWidth={2.4} /> : <Copy size={14} strokeWidth={2.2} />}
                    {copied ? 'Copied' : 'Copy link'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Roster + settings ── */}
          <div className="flex flex-col gap-5">
            <div className="on-ice flex flex-col">
              <div className="flex items-baseline justify-between px-5 pt-5 pb-3">
                <MonoLabel size={10} tracking="0.22em">On the bench</MonoLabel>
                <MonoLabel size={9} tracking="0.16em">Tap a name to make them boss</MonoLabel>
              </div>

              {players.map((player, i) => (
                  <div
                    key={player.id}
                    className="relative flex items-center gap-3 px-5 py-3"
                    style={{
                      borderBottom: '1px solid rgba(13,27,42,0.09)',
                      borderLeft: `5px solid ${player.isBoss ? RED : INK}`,
                      background: player.isBoss ? 'rgba(207,10,44,0.06)' : 'transparent',
                    }}
                  >
                    <span className="font-mono" style={{ fontSize: 9, width: 14, color: '#55677d' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <Avatar url={player.avatarUrl} name={player.name} size={30} />
                    <span
                      className="font-display min-w-0 flex-1 truncate"
                      style={{ fontWeight: 700, fontSize: 22, textTransform: 'uppercase', color: INK }}
                    >
                      {player.name}
                    </span>

                    {player.isHost && <MonoLabel size={9} tracking="0.14em">Host</MonoLabel>}
                    {player.isBoss && (
                      <span
                        className="font-mono"
                        style={{ fontSize: 9, letterSpacing: '0.14em', color: '#fff', background: RED, padding: '3px 7px' }}
                      >
                        BOSS
                      </span>
                    )}
                    {player.id === myId && (
                      <MonoLabel size={9} tracking="0.14em">You</MonoLabel>
                    )}

                    {isHost && (
                      <button
                        type="button"
                        onClick={() => handleAssignBoss(player.isBoss ? null : player.id)}
                        className="btn-ice font-mono shrink-0"
                        style={{
                          border: 'none',
                          background: 'transparent',
                          padding: '4px 0',
                          fontSize: 9,
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          color: '#55677d',
                          textDecoration: 'underline',
                          textUnderlineOffset: 3,
                          cursor: 'pointer',
                        }}
                      >
                        {player.isBoss ? 'Clear' : 'Make boss'}
                      </button>
                    )}
                  </div>
              ))}

              {/* Open seats fill in one by one as phones connect. */}
              {Array.from({ length: Math.min(openSeats, 4) }).map((_, i) => (
                <div
                  key={`open-${i}`}
                  className="penalty-hatch flex items-center gap-3 px-5 py-3"
                  style={{
                    borderBottom: '1px solid rgba(13,27,42,0.09)',
                    borderLeft: `5px solid ${DEAD}`,
                  }}
                >
                  <span className="font-mono" style={{ fontSize: 9, width: 14, color: '#7d8b9c' }}>
                    {String(players.length + i + 1).padStart(2, '0')}
                  </span>
                  <span
                    className="font-display flex-1"
                    style={{ fontWeight: 700, fontSize: 22, textTransform: 'uppercase', color: '#7d8b9c' }}
                  >
                    Open seat
                  </span>
                  <MonoLabel size={9} tracking="0.14em" color="#7d8b9c">Scan to join</MonoLabel>
                </div>
              ))}
            </div>

            <div className="on-ice flex flex-col gap-3 p-5">
              <MonoLabel size={10} tracking="0.22em">Settings</MonoLabel>
              {[
                { key: 'Mode', value: modeName },
                { key: 'Questions', value: String(game?.questionCount ?? 10) },
                {
                  key: 'Difficulty',
                  value: configTiers.length
                    ? configTiers.map((t) => t[0].toUpperCase() + t.slice(1)).join(' + ')
                    : '—',
                },
                {
                  key: 'Answers',
                  value: game?.answerMode === 'freetext' ? 'Type it' : 'Multiple choice',
                },
                {
                  key: 'Reveal',
                  value: game?.revealMode === 'timed' ? 'Column by column' : 'All at once',
                },
              ].map((row) => (
                <div
                  key={row.key}
                  className="flex items-baseline justify-between gap-3 pb-2.5"
                  style={{ borderBottom: '1px solid rgba(13,27,42,0.07)' }}
                >
                  <MonoLabel size={9} tracking="0.2em">{row.key}</MonoLabel>
                  <span
                    className="font-display"
                    style={{ fontWeight: 700, fontSize: 20, color: INK, textTransform: 'uppercase' }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <AdsterraBanner slot="lobby" />
      </div>

      {/* ── Start bar ── */}
      <div className="fixed inset-x-0 bottom-0 z-40">
        <Kickplate height={4} />
        <div
          className="flex flex-wrap items-center gap-4 px-5 py-4 md:px-8"
          style={{ background: INK }}
        >
          <MonoLabel size={10} tracking="0.14em" color="#8d9cb0">
            {isHost ? 'Everyone in? Phones are the buzzers.' : 'Waiting for the host to start'}
          </MonoLabel>

          {isHost && (
            <div className="flex w-full items-center gap-2.5 sm:ml-auto sm:w-auto">
              <Button variant="ghost" size="sm" onClick={() => router.push(`/${roomId}/setup`)}>
                <Settings size={14} strokeWidth={2.2} />
                Setup
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={!canStart || starting}
                onClick={handleStartGame}
                className="flex-1 sm:flex-none"
              >
                {starting ? 'Starting…' : 'Drop the puck'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Boss selection ── */}
      <AnimatePresence>
        {showBossModal && (
          <Modal open onClose={() => setShowBossModal(false)}>
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <MonoLabel size={9}>Spectator mode</MonoLabel>
                <h2
                  className="font-display m-0"
                  style={{ fontWeight: 800, fontSize: 38, lineHeight: 1, textTransform: 'uppercase' }}
                >
                  Assign a boss
                </h2>
                <p className="m-0" style={{ fontSize: 13.5, lineHeight: 1.6, color: '#55677d' }}>
                  This screen is only showing the board, so someone on a phone has to reveal
                  answers and advance rounds.
                </p>
              </div>

              <div className="flex flex-col">
                {players.map((player) => {
                  const picked = pendingBossId === player.id
                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => setPendingBossId(player.id)}
                      aria-pressed={picked}
                      className="btn-ice flex items-center gap-3 px-3 py-2.5 text-left"
                      style={{
                        border: 'none',
                        borderLeft: `5px solid ${picked ? RED : 'transparent'}`,
                        borderBottom: '1px solid rgba(13,27,42,0.09)',
                        background: picked ? 'rgba(207,10,44,0.06)' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <Avatar url={player.avatarUrl} name={player.name} size={28} />
                      <span
                        className="font-display flex-1 truncate"
                        style={{ fontWeight: 700, fontSize: 20, textTransform: 'uppercase', color: INK }}
                      >
                        {player.name}
                      </span>
                      {picked && <Check size={15} strokeWidth={2.4} color={RED} />}
                    </button>
                  )
                })}
              </div>

              <div className="grid grid-cols-2 gap-px" style={{ background: 'rgba(13,27,42,0.12)' }}>
                <Button variant="ghost" flush onClick={() => setShowBossModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  flush
                  disabled={!pendingBossId || starting}
                  onClick={() => {
                    if (!pendingBossId) return
                    handleAssignBoss(pendingBossId)
                    setShowBossModal(false)
                    doStartGame()
                  }}
                >
                  {starting ? 'Starting…' : 'Assign & start'}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </main>
  )
}
