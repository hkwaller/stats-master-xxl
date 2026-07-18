'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { nanoid } from 'nanoid'
import { QRCodeSVG } from 'qrcode.react'
import { useStorage } from '@/lib/liveblocks/client'
import { useAssignBoss, useJoinGame, useStartGame } from '@/lib/liveblocks/mutations'
import { getOrCreateGuest } from '@/lib/guest'
import { useAdFree } from '@/hooks/useAdFree'
import { Button } from '@/components/design-system'
import { CBrand } from '@/components/arcade'
import { AdsterraBanner } from '@/components/ads/AdsterraBanner'
import type { CareerQuestion, H2HPair, HLPair, Question } from '@/types/game'

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

  return (
    <main className="ice-bg min-h-screen px-4 py-6">
      <div className="max-w-5xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <CBrand small />
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#e32437',
              color: '#fff',
              border: '2px solid #0a1535',
              borderRadius: 9999,
              padding: '6px 14px',
              fontFamily: 'var(--font-archivo-black), sans-serif',
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: '0.2em',
              boxShadow: '0 3px 0 #0a1535',
            }}
          >
            <span
              className="animate-pulse"
              style={{
                width: 7,
                height: 7,
                background: '#fff',
                borderRadius: '50%',
                display: 'inline-block',
              }}
            />
            WAITING TO START
          </div>
        </div>

        {/* ── Heading row ── */}
        <div className="flex items-end justify-between" style={{ gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-block',
                background: '#ffcf33',
                border: '2px solid #0a1535',
                borderRadius: 9999,
                padding: '4px 14px',
                fontFamily: 'var(--font-archivo-black), sans-serif',
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: '0.22em',
                color: '#0a1535',
                boxShadow: '0 3px 0 #0a1535',
              }}
            >
              STEP 2 OF 2
            </span>
            <h2
              style={{
                fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
                fontSize: 30,
                lineHeight: 0.95,
                color: '#0a1535',
                margin: 0,
              }}
            >
              GATHER YOUR SQUAD
            </h2>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-jetbrains-mono), monospace',
              fontSize: 12,
              letterSpacing: '0.16em',
              color: '#6b7ea0',
              textTransform: 'uppercase',
            }}
          >
            {configSummary}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-5"
          style={{ gridTemplateColumns: '360px 1fr', alignItems: 'start' }}
        >
          {/* ── LEFT: QR / invite card ── */}
          <div
            style={{
              background: '#fff',
              border: '2px solid #0a1535',
              borderRadius: 16,
              padding: 20,
              boxShadow: '0 5px 0 #0a1535',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-archivo-black), sans-serif',
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: '0.22em',
                color: '#6b7ea0',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}
            >
              📱 SCAN TO JOIN
            </div>

            {/* QR box */}
            {connectUrl && (
              <div
                style={{
                  width: 170,
                  height: 170,
                  background: '#fff',
                  padding: 10,
                  border: '2px solid #0a1535',
                  borderRadius: 12,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <QRCodeSVG
                  value={connectUrl}
                  size={150}
                  bgColor="#ffffff"
                  fgColor="#0a1535"
                />
              </div>
            )}

            {/* URL chip */}
            <div
              style={{
                background: '#eef1f8',
                border: '2px solid #0a1535',
                borderRadius: 10,
                padding: '8px 12px',
                width: '100%',
                textAlign: 'center',
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                fontSize: 12,
                letterSpacing: '0.06em',
                color: '#0a1535',
                wordBreak: 'break-all',
              }}
            >
              {connectUrl}
            </div>

            {/* Copy link */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              style={{ whiteSpace: 'nowrap' }}
            >
              {copied ? '✓ COPIED!' : '📋 COPY LINK'}
            </Button>
          </div>

          {/* ── RIGHT: Roster card ── */}
          <div
            style={{
              background: '#fff',
              border: '2px solid #0a1535',
              borderRadius: 16,
              padding: 20,
              boxShadow: '0 5px 0 #0a1535',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div
                style={{
                  fontFamily: 'var(--font-archivo-black), sans-serif',
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: '0.22em',
                  color: '#6b7ea0',
                  textTransform: 'uppercase',
                }}
              >
                ON THE BENCH
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
                  fontSize: 18,
                  color: '#0a1535',
                }}
              >
                {players.length}/{maxPlayers}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3" style={{ minHeight: 160 }}>
              {players.map((player) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: '#fff',
                    border: '2px solid #0a1535',
                    borderRadius: 12,
                    padding: '10px 12px',
                    boxShadow: '0 2px 0 rgba(10,21,53,0.25)',
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      border: '2px solid #0a1535',
                      borderRadius: 10,
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={player.avatarUrl}
                      alt={player.name}
                      width={38}
                      height={38}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
                        fontSize: 13,
                        lineHeight: 1,
                        color: '#0a1535',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {player.name}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-jetbrains-mono), monospace',
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.16em',
                        color: '#6b7ea0',
                        marginTop: 4,
                      }}
                    >
                      READY
                    </div>
                  </div>
                  {player.isHost && (
                    <span
                      style={{
                        background: '#0a1535',
                        color: '#ffcf33',
                        padding: '3px 8px',
                        fontFamily: 'var(--font-archivo-black), sans-serif',
                        fontSize: 9,
                        borderRadius: 6,
                        border: '2px solid #0a1535',
                        letterSpacing: '0.14em',
                        flexShrink: 0,
                      }}
                    >
                      HOST
                    </span>
                  )}
                  {player.isBoss && (
                    <span
                      style={{
                        background: '#e32437',
                        color: '#fff',
                        padding: '3px 8px',
                        fontFamily: 'var(--font-archivo-black), sans-serif',
                        fontSize: 9,
                        borderRadius: 6,
                        border: '2px solid #0a1535',
                        letterSpacing: '0.14em',
                        flexShrink: 0,
                      }}
                    >
                      👑 BOSS
                    </span>
                  )}
                  {isHost && (
                    <button
                      onClick={() => handleAssignBoss(player.isBoss ? null : player.id)}
                      title={player.isBoss ? 'Remove boss' : 'Make boss'}
                      style={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        border: '2px solid #0a1535',
                        background: player.isBoss ? '#ffcf33' : '#fff',
                        cursor: 'pointer',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 11,
                        boxShadow: '0 2px 0 #0a1535',
                      }}
                    >
                      👑
                    </button>
                  )}
                </motion.div>
              ))}

              {/* Empty slot */}
              {players.length < maxPlayers && (
                <div
                  style={{
                    gridColumn: players.length % 2 === 0 ? '1 / -1' : 'auto',
                    border: '2px dashed #9aa2bd',
                    borderRadius: 12,
                    padding: 18,
                    display: 'grid',
                    placeItems: 'center',
                    minHeight: 60,
                    fontFamily: 'var(--font-archivo-black), sans-serif',
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: '#9aa2bd',
                  }}
                >
                  WAITING FOR PLAYERS…
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── START BAR ── */}
        <div
          style={{
            background: '#0a1535',
            borderRadius: 14,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-jetbrains-mono), monospace',
              fontSize: 12,
              letterSpacing: '0.14em',
              color: '#c3d2f0',
              textTransform: 'uppercase',
            }}
          >
            {isHost ? 'EVERYONE IN? PHONES ARE THE BUZZERS.' : 'WAITING FOR HOST TO START THE GAME…'}
          </div>
          {isHost && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Button
                variant="ghost"
                size="md"
                onClick={() => router.push(`/${roomId}/setup`)}
              >
                ⚙ BACK TO SETUP
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={!canStart || starting}
                onClick={handleStartGame}
              >
                {starting ? '⏳ STARTING…' : '🏒 DROP THE PUCK'}
              </Button>
            </div>
          )}
        </div>

        <AdsterraBanner slot="lobby" />
      </div>

      {/* ── Boss selection modal ── */}
      {showBossModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(10,21,53,0.65)', backdropFilter: 'blur(4px)' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            style={{
              background: '#fff',
              border: '3px solid #0a1535',
              borderRadius: 18,
              boxShadow: '0 10px 0 #0a1535',
              width: '100%',
              maxWidth: 380,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
                  fontSize: 24,
                  color: '#0a1535',
                  margin: 0,
                }}
              >
                ASSIGN A BOSS
              </h2>
              <p
                style={{
                  fontFamily: 'var(--font-body), sans-serif',
                  fontSize: 13,
                  color: '#6b7ea0',
                  marginTop: 8,
                }}
              >
                Spectator mode needs a Boss to reveal answers and advance rounds.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {players.map((player) => (
                <button
                  key={player.id}
                  onClick={() => setPendingBossId(player.id)}
                  style={{
                    background: pendingBossId === player.id ? '#ffcf33' : '#fff',
                    border: '2.5px solid #0a1535',
                    borderRadius: 12,
                    padding: '12px 14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    textAlign: 'left',
                    boxShadow: pendingBossId === player.id ? '0 4px 0 #0a1535' : '0 2px 0 rgba(10,21,53,0.2)',
                    transition: 'all 0.1s',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={player.avatarUrl}
                    alt={player.name}
                    width={32}
                    height={32}
                    style={{ borderRadius: 10, border: '2px solid #0a1535', flexShrink: 0 }}
                  />
                  <span
                    style={{
                      fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
                      fontSize: 14,
                      color: '#0a1535',
                      flex: 1,
                    }}
                  >
                    {player.name}
                  </span>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      border: '2px solid #0a1535',
                      background: pendingBossId === player.id ? '#0a1535' : '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {pendingBossId === player.id && (
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: '#ffcf33',
                        }}
                      />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                size="sm"
                style={{ flex: 1 }}
                onClick={() => setShowBossModal(false)}
              >
                CANCEL
              </Button>
              <Button
                variant="primary"
                size="sm"
                style={{ flex: 1 }}
                disabled={!pendingBossId || starting}
                onClick={() => {
                  if (!pendingBossId) return
                  handleAssignBoss(pendingBossId)
                  setShowBossModal(false)
                  doStartGame()
                }}
              >
                {starting ? '⏳ STARTING…' : '👑 ASSIGN & START'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  )
}
