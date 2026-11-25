'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { nanoid } from 'nanoid'
import { QRCodeSVG } from 'qrcode.react'
import { useStorage } from '@/lib/party/client'
import { useAssignBoss, useJoinGame, useStartGame } from '@/lib/party/mutations'
import { getOrCreateGuest } from '@/lib/guest'
import { Check, Copy, Settings } from 'lucide-react'
import { Button, Modal, MonoLabel } from '@/components/design-system'
import { Jersey } from '@/components/game/Jersey'
import { jerseyFor } from '@/lib/jersey'
import { PuckMark } from '@/components/arcade'
import type { CareerQuestion, H2HPair, HLPair, Player, Question } from '@/types/game'

const INK = '#14213d'
const DEAD = '#8ea3c2'

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
    if (!game || !roomId || hasJoined) return
    const g = getOrCreateGuest()
    const isHost = game.hostId === g.id || game.hostId === ''
    if (!isHost || game.hostPlays !== false) {
      if (!g.name?.trim()) {
        router.replace(`/${roomId}/connect?returnTo=lobby`)
        return
      }
      joinGame({ id: g.id, name: g.name })
    }
    setMyId(g.id)
    setHasJoined(true)
  }, [game, roomId, joinGame, hasJoined, router])

  useEffect(() => {
    if (!game || !roomId || !myId) return
    const isHost = game.hostId === myId
    if (isHost) return
    if (
      game.command === 'starting' ||
      game.command === 'answering' ||
      game.command === 'question'
    ) {
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
    const hasBoss = !!game?.bossId
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
            tiers,
            eras,
            count,
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
            eras,
            count,
            minSeasons: game?.careerMinSeasons ?? 5,
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

      startGame({
        requesterId: myId,
        questionSequence,
        bossToken,
        gameMode,
        careerData,
        h2hPairs,
        hlPairs,
      })

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

  const players = (game?.players ?? []) as Player[]
  const isHost = game?.hostId === myId
  const canStart = players.length >= 1
  const maxPlayers = 8
  const modeName =
    {
      classic: 'Classic',
      career: 'Career',
      h2h: 'Head-to-Head',
      'higher-lower': 'Higher or Lower',
    }[game?.gameMode ?? 'classic'] ?? 'Classic'
  const configTiers = (game?.difficultyTiers as string[] | undefined) ?? []
  const configSummary = [
    modeName.toUpperCase(),
    `${game?.questionCount ?? 10} ${game?.gameMode === 'classic' || !game?.gameMode ? 'CARDS' : 'ROUNDS'}`,
    configTiers.length ? configTiers.map((t) => t.toUpperCase()).join(' + ') : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const openSeats = Math.max(0, maxPlayers - players.length)

  const hooks = Array.from({ length: maxPlayers }, (_, i) => players[i] ?? null)

  return (
    <main className="ice-bg relative flex min-h-screen flex-col overflow-x-hidden">
      {/* ── Header ── */}
      <header className="relative z-20 flex flex-wrap items-center gap-2.5 px-5 pt-5 md:px-10">
        <div className="mr-auto flex items-center gap-2.5">
          <PuckMark size={30} />
          <span className="font-display" style={{ fontSize: 28, lineHeight: 1, letterSpacing: '0.02em' }}>
            STATS MASTER
          </span>
        </div>
        <span
          className="font-mono"
          style={{
            background: '#fff',
            border: `2px solid ${INK}`,
            borderRadius: 999,
            padding: '6px 14px',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {configSummary}
        </span>
      </header>

      <div className="relative z-[2] mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-5 pt-6 pb-[132px] md:px-10">
        {/* ── Title ── */}
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <h1 className="font-display m-0" style={{ fontSize: 'clamp(40px,7vw,64px)', lineHeight: 1, textTransform: 'uppercase' }}>
            The locker room
          </h1>
          <span style={{ fontSize: 18, fontWeight: 500, color: 'var(--color-ink-2)' }}>
            {players.length} of {maxPlayers} hooks taken. Pick a sweater on your phone to join.
          </span>
        </div>

        {/* ── The hooks ── */}
        <section aria-label="Players" className="relative pt-[18px]">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-2.5"
            style={{ height: 10, borderRadius: 5, background: INK }}
          />
          <ol className="m-0 grid list-none grid-cols-4 gap-x-4 gap-y-6 p-0 lg:grid-cols-8">
            {hooks.map((player, i) => (
              <li key={player?.id ?? `open-${i}`} className="relative flex flex-col items-center">
                <svg aria-hidden="true" width="20" height="22" viewBox="0 0 20 22">
                  <path
                    d="M10 0 V12 Q10 19 4 17"
                    fill="none"
                    stroke={player ? INK : DEAD}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>
                {player ? (
                  <>
                    <Jersey
                      jersey={jerseyFor(player)}
                      name={player.name}
                      size={130}
                      className="h-auto w-full max-w-[130px]"
                    />
                    {player.isHost && (
                      <span
                        className="captain-patch absolute"
                        title="Host · Captain"
                        aria-label="Host"
                        style={{ top: 30, right: 0 }}
                      >
                        C
                      </span>
                    )}
                    <span className="font-display mt-1.5 max-w-full truncate" style={{ fontSize: 20, textTransform: 'uppercase' }}>
                      {player.name}
                    </span>
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      {player.isBoss && (
                        <span
                          className="font-mono"
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#fff',
                            background: 'var(--color-cobalt)',
                            borderRadius: 999,
                            padding: '2px 8px',
                          }}
                        >
                          BOSS
                        </span>
                      )}
                      {player.id === myId && <MonoLabel size={11}>You</MonoLabel>}
                    </div>
                    {isHost && (
                      <button
                        type="button"
                        onClick={() => handleAssignBoss(player.isBoss ? null : player.id)}
                        className="font-mono mt-0.5 min-h-[36px]"
                        style={{
                          border: 'none',
                          background: 'transparent',
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: 'var(--color-ink-2)',
                          textDecoration: 'underline',
                          textUnderlineOffset: 3,
                          cursor: 'pointer',
                        }}
                      >
                        {player.isBoss ? 'Clear boss' : 'Make boss'}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 120 128"
                      className="h-auto w-full max-w-[130px]"
                    >
                      <path
                        d="M44 6 L12 16 L1 88 L21 93 L31 48 L31 123 L89 123 L89 48 L99 93 L119 88 L108 16 L76 6 Q60 13 44 6 Z"
                        fill="none"
                        stroke={DEAD}
                        strokeWidth="2.5"
                        strokeDasharray="6 5"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <MonoLabel size={12}>Open hook</MonoLabel>
                  </>
                )}
              </li>
            ))}
          </ol>
        </section>

        <div className="grid items-stretch gap-5 lg:grid-cols-[1.4fr_1fr]">
          {/* ── Join ── */}
          <div className="on-ice flex flex-wrap items-center gap-5 p-5">
            {connectUrl && (
              <div className="shrink-0 rounded-[10px] bg-white p-2" style={{ border: '2px solid var(--color-ice-2)' }}>
                <QRCodeSVG value={connectUrl} size={116} bgColor="#ffffff" fgColor="#14213d" level="M" />
              </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <MonoLabel size={12}>Scan or go to {connectUrl.replace(/^https?:\/\//, '').replace(/\/[^/]+\/connect$/, '')}</MonoLabel>
              <span
                className="font-display tabular-nums"
                style={{ fontSize: 'clamp(52px,8vw,78px)', lineHeight: 0.95, letterSpacing: '0.06em' }}
              >
                {roomId || '-'}
              </span>
              <div>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  {copied ? <Check size={15} strokeWidth={2.6} /> : <Copy size={15} strokeWidth={2.4} />}
                  {copied ? 'Copied' : 'Copy link'}
                </Button>
              </div>
            </div>
          </div>

          {/* ── Settings ── */}
          <div className="on-ice flex flex-col gap-2.5 p-5">
            <MonoLabel size={12}>The game</MonoLabel>
            {[
              { key: 'Mode', value: modeName },
              { key: game?.gameMode === 'classic' ? 'Cards' : 'Rounds', value: String(game?.questionCount ?? 10) },
              {
                key: 'Difficulty',
                value: configTiers.length
                  ? configTiers.map((t) => t[0].toUpperCase() + t.slice(1)).join(' + ')
                  : '-',
              },
              {
                key: 'Answers',
                value: game?.gameMode === 'career' ? 'Buzz in and type' : game?.answerMode === 'freetext' ? 'Type it' : 'Multiple choice',
              },
              {
                key: 'Reveal',
                value: game?.gameMode === 'career' ? 'First season first · Every 3 seconds' : game?.revealMode === 'timed' ? 'Stat by stat' : 'All at once',
              },
              ...(game?.gameMode === 'career' ? [{
                key: 'Season years',
                value: game.careerShowYears === false ? 'Hidden' : 'Shown',
              }] : []),
            ].map((row) => (
              <div
                key={row.key}
                className="flex items-baseline justify-between gap-3 pb-2"
                style={{ borderBottom: '2px solid var(--color-ice-2)' }}
              >
                <MonoLabel size={11}>{row.key}</MonoLabel>
                <span className="font-display" style={{ fontSize: 20, textTransform: 'uppercase' }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Deal bar ── */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 flex flex-wrap items-center gap-4 px-5 py-4 md:px-10"
        style={{ background: '#fff', borderTop: `3px solid ${INK}` }}
      >
        <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-ink-2)' }}>
          {isHost ? 'Everyone dressed? Phones are the sticks.' : 'Waiting for the host to deal'}
        </span>

        {isHost && (
          <div className="flex w-full items-center gap-2.5 sm:ml-auto sm:w-auto">
            <Button variant="ghost" size="sm" onClick={() => router.push(`/${roomId}/setup`)}>
              <Settings size={15} strokeWidth={2.4} />
              Setup
            </Button>
            <Button
              variant="primary"
              size="lg"
              disabled={!canStart || starting}
              onClick={handleStartGame}
              className="flex-1 sm:flex-none"
            >
              {starting ? 'Dealing…' : 'Deal cards'}
            </Button>
          </div>
        )}
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
                  style={{
                    fontWeight: 800,
                    fontSize: 38,
                    lineHeight: 1,
                    textTransform: 'uppercase',
                  }}
                >
                  Assign a boss
                </h2>
                <p className="m-0" style={{ fontSize: 13.5, lineHeight: 1.6, color: '#4a5a78' }}>
                  This screen is only showing the board, so someone on a phone has to reveal answers
                  and advance rounds.
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
                      className="flex items-center gap-3 px-3 py-2 text-left"
                      style={{
                        border: picked ? `3px solid ${INK}` : '2px solid var(--color-ice-2)',
                        borderRadius: 14,
                        marginBottom: 6,
                        background: picked ? 'var(--color-ice-1)' : '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      <Jersey jersey={jerseyFor(player)} size={36} decorative />
                      <span
                        className="font-display flex-1 truncate"
                        style={{
                          fontWeight: 700,
                          fontSize: 20,
                          textTransform: 'uppercase',
                          color: INK,
                        }}
                      >
                        {player.name}
                      </span>
                      {picked && <Check size={18} strokeWidth={3} color="var(--color-cobalt)" />}
                    </button>
                  )
                })}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <Button variant="ghost" onClick={() => setShowBossModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
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
