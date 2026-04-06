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
import type { Question } from '@/types/game'

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

  // Join game once storage is safely loaded
  useEffect(() => {
    if (!game || hasJoined) return
    
    const g = getOrCreateGuest()
    setMyId(g.id)
    joinGame({ id: g.id, name: g.name })
    setHasJoined(true)
  }, [game, joinGame, hasJoined])

  // Other players (non-host) follow when game starts
  useEffect(() => {
    if (!game || !roomId || !myId) return
    const isHost = game.hostId === myId
    if (isHost) return  // host navigated manually via button
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

      const res = await fetch('/api/questions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tiers: game?.difficultyTiers ?? ['easy', 'medium'],
          eras: game?.eras ?? ['1970s', '1980s', '1990s', '2000s', '2010s', '2020s'],
          count: game?.questionCount ?? 10,
          answerMode: game?.answerMode ?? 'multiplechoice',
          excludeIds,
        }),
      })
      const { questions } = await res.json() as { questions: Question[] }
      const bossToken = nanoid(12)
      startGame({ requesterId: myId, questionSequence: questions, bossToken })
      router.push(`/nhl-stats-master/${roomId}/player/${myId}`)
    } catch {
      setStarting(false)
    }
  }

  const players = (game?.players ?? []) as { id: string; name: string; avatarUrl: string; score: number; isHost: boolean; isBoss: boolean }[]
  const isHost = game?.hostId === myId
  const canStart = players.length >= 1

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
            <GameHeading>Lobby</GameHeading>

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
