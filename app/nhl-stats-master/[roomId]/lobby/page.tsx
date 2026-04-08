'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { nanoid } from 'nanoid'
import { QRCodeSVG } from 'qrcode.react'
import { useStorage } from '@/lib/liveblocks/client'
import { useJoinGame, useStartGame } from '@/lib/liveblocks/mutations'
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

  const game = useStorage((root) => root.game)
  const joinGame = useJoinGame()
  const startGame = useStartGame()
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
    joinGame({ id: g.id, name: g.name })
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

  async function handleStartGame() {
    if (!myId || starting) return
    setStarting(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const dailyKey = `nhl-played-${today}`
      const excludeIds: string[] = JSON.parse(localStorage.getItem(dailyKey) ?? '[]')

      const gameMode = game?.gameMode ?? 'classic'
      const tiers = game?.difficultyTiers ?? ['easy', 'medium']
      const eras = game?.eras ?? ['1970s', '1980s', '1990s', '2000s', '2010s', '2020s']
      const count = game?.questionCount ?? 10
      const bossToken = nanoid(12)

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
      router.push(`/nhl-stats-master/${roomId}/player/${myId}`)
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
              <p className="text-sm font-bold uppercase tracking-widest text-game-text-muted">
                Players ({players.length})
              </p>
              <div className="space-y-2">
                {players.map((player) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <PlayerChip
                      name={player.name}
                      avatarUrl={player.avatarUrl}
                      score={0}
                      isHost={player.isHost}
                      isBoss={player.isBoss}
                      isMe={player.id === myId}
                    />
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
    </main>
  )
}
