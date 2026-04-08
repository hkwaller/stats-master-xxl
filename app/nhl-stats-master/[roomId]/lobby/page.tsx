'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { nanoid } from 'nanoid'
import { QRCodeSVG } from 'qrcode.react'
import { useStorage } from '@/lib/liveblocks/client'
import { useAssignBoss, useJoinGame, useStartGame } from '@/lib/liveblocks/mutations'
import { getOrCreateGuest } from '@/lib/guest'
import {
  Panel,
  Button,
  PlayerChip,
  GameLogo,
  GameDivider,
  GameHeading,
} from '@/components/design-system'
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
  const joinGame = useJoinGame()
  const startGame = useStartGame()
  const assignBoss = useAssignBoss()
  const [hasJoined, setHasJoined] = useState(false)

  useEffect(() => {
    params.then(({ roomId }) => {
      setRoomId(roomId)
      const base = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      setConnectUrl(`${base}/nhl-stats-master/${roomId}/connect`)
    })
  }, [params])

  useEffect(() => {
    if (!game || hasJoined) return
    const g = getOrCreateGuest()
    setMyId(g.id)
    const isHost = game.hostId === g.id || game.hostId === ''
    // Only join as player if host chose to play, or if this is a non-host joiner
    if (!isHost || game.hostPlays !== false) {
      joinGame({ id: g.id, name: g.name })
    }
    setHasJoined(true)
  }, [game, joinGame, hasJoined])

  // Non-host players follow when game starts
  useEffect(() => {
    if (!game || !roomId || !myId) return
    const isHost = game.hostId === myId
    if (isHost) return
    if (game.command === 'starting' || game.command === 'answering' || game.command === 'question') {
      router.push(`/nhl-stats-master/${roomId}/player/${myId}`)
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
    // If host isn't playing and nobody is boss yet, show boss selection modal
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
        // Exclude recently-played playerIds
        const playedCareerKey = `nhl-career-played-${today}`
        const excludePlayerIds: number[] = JSON.parse(localStorage.getItem(playedCareerKey) ?? '[]')

        const res = await fetch('/api/questions/generate-career', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eras,
            count,
            minSeasons: game?.careerMinSeasons ?? 5,
            maxReveals: game?.careerMaxReveals ?? 8,
            revealOrder: game?.careerRevealOrder ?? 'best-first',
            excludePlayerIds,
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
          body: JSON.stringify({
            tiers,
            eras,
            count,
            field: game?.hlComparisonField ?? 'points',
          }),
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
        router.push(`/nhl-stats-master/${roomId}/player/${myId}`)
      } else {
        router.push(`/nhl-stats-master/${roomId}/game`)
      }
    } catch {
      setStarting(false)
    }
  }

  const players = (game?.players ?? []) as { id: string; name: string; avatarUrl: string; score: number; isHost: boolean; isBoss: boolean }[]
  const isHost = game?.hostId === myId
  const canStart = players.length >= 1
  const modeName = {
    'classic': 'Classic',
    'career': 'Career',
    'h2h': 'Head-to-Head',
    'higher-lower': 'Higher or Lower',
  }[game?.gameMode ?? 'classic'] ?? 'Classic'

  return (
    <main className="game-bg-pattern min-h-screen px-4 py-8">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <GameLogo />
          <div className="text-right">
            <p className="text-xs text-game-text-muted uppercase tracking-wide">Room</p>
            <p className="text-2xl font-bold tracking-widest text-ice-blue">{roomId}</p>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Panel className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <GameHeading>Lobby</GameHeading>
              <span className="text-xs font-bold uppercase tracking-widest bg-magenta text-white px-2 py-1 border-2 border-black shadow-[2px_2px_0_#000]">
                {modeName}
              </span>
            </div>

            {/* Join link + QR */}
            <div className="flex gap-4 items-start">
              <div className="bg-white p-2 rounded-xl flex-shrink-0">
                {connectUrl && (
                  <QRCodeSVG value={connectUrl} size={100} bgColor="#ffffff" fgColor="#0a0e1a" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm font-bold uppercase tracking-widest text-game-text-muted">
                  Invite Players
                </p>
                <p className="text-xs text-game-text-muted break-all">{connectUrl}</p>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  {copied ? '✓ Copied!' : '📋 Copy Link'}
                </Button>
              </div>
            </div>

            <GameDivider />

            {/* Players list */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold uppercase tracking-widest text-game-text-muted">
                  Players ({players.length})
                </p>
                {isHost && players.length > 0 && (
                  <p className="text-xs text-game-text-muted">👑 = Boss</p>
                )}
              </div>
              <div className="space-y-2">
                {players.map((player) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2"
                  >
                    <div className="flex-1">
                      <PlayerChip
                        name={player.name}
                        avatarUrl={player.avatarUrl}
                        score={0}
                        isHost={player.isHost}
                        isBoss={player.isBoss}
                        isMe={player.id === myId}
                      />
                    </div>
                    {isHost && (
                      <button
                        onClick={() => handleAssignBoss(player.isBoss ? null : player.id)}
                        title={player.isBoss ? 'Remove boss' : 'Make boss'}
                        className={`
                          w-9 h-9 shrink-0 border-2 border-black flex items-center justify-center
                          shadow-[2px_2px_0_#000] transition-all text-base
                          ${player.isBoss
                            ? 'bg-yellow shadow-[3px_3px_0_#000] -translate-x-px -translate-y-px'
                            : 'bg-white hover:bg-yellow/40'
                          }
                        `}
                      >
                        👑
                      </button>
                    )}
                  </motion.div>
                ))}
                {players.length === 0 && (
                  <p className="text-game-text-muted text-sm text-center py-4">
                    Waiting for players to join…
                  </p>
                )}
              </div>
            </div>

            {/* Host actions */}
            {isHost && (
              <>
                <GameDivider />
                <div className="space-y-3">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    disabled={!canStart || starting}
                    onClick={handleStartGame}
                  >
                    {starting ? '⏳ Starting…' : '🚀 Start Game'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => router.push(`/nhl-stats-master/${roomId}/setup`)}
                  >
                    ← Back to Setup
                  </Button>
                </div>
              </>
            )}

            {!isHost && (
              <p className="text-center text-game-text-muted text-sm">
                Waiting for host to start the game…
              </p>
            )}
          </Panel>
        </motion.div>

        <AdsterraBanner slot="lobby" />
      </div>

      {/* Boss selection modal — shown when hostPlays=false and no boss assigned */}
      {showBossModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white border-4 border-black shadow-[8px_8px_0_#000] w-full max-w-sm p-6 space-y-5"
          >
            <div>
              <h2 className="text-xl font-bold uppercase tracking-widest text-black">Assign a Boss</h2>
              <p className="text-sm text-black/60 mt-1">
                Since this device is in spectator mode, a player needs boss controls to reveal answers and advance rounds.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-black/50">Choose Boss</p>
              <div className="space-y-2">
                {players.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => setPendingBossId(player.id)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 border-2 border-black text-left
                      transition-all shadow-[2px_2px_0_#000]
                      ${pendingBossId === player.id
                        ? 'bg-yellow shadow-[4px_4px_0_#000] -translate-x-0.5 -translate-y-0.5'
                        : 'bg-white hover:bg-yellow/20'
                      }
                    `}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={player.avatarUrl} alt={player.name} width={32} height={32} className="w-8 h-8 rounded-full border-2 border-black" />
                    <span className="font-bold text-sm text-black flex-1">{player.name}</span>
                    <div className={`w-5 h-5 border-2 border-black flex items-center justify-center rounded-full ${pendingBossId === player.id ? 'bg-black' : 'bg-white'}`}>
                      {pendingBossId === player.id && <div className="w-2 h-2 rounded-full bg-yellow" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={() => setShowBossModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                disabled={!pendingBossId || starting}
                onClick={() => {
                  if (!pendingBossId) return
                  handleAssignBoss(pendingBossId)
                  setShowBossModal(false)
                  doStartGame()
                }}
              >
                {starting ? '⏳ Starting…' : '👑 Assign & Start'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  )
}
