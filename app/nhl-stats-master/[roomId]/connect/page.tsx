'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useStorage } from '@/lib/liveblocks/client'
import { useJoinGame } from '@/lib/liveblocks/mutations'
import { getOrCreateGuest, updateGuestName } from '@/lib/guest'
import { getAvatarUrl } from '@/lib/avatar'
import { Button, GameLogo } from '@/components/design-system'

interface ConnectPageProps {
  params: Promise<{ roomId: string }>
}

export default function ConnectPage({ params }: ConnectPageProps) {
  const router = useRouter()
  const [roomId, setRoomId] = useState('')
  const [name, setName] = useState('')
  const [guestId, setGuestId] = useState('')
  const [joining, setJoining] = useState(false)

  const game = useStorage((root) => root.game)
  const joinGame = useJoinGame()

  useEffect(() => {
    params.then(({ roomId }) => setRoomId(roomId))
    const guest = getOrCreateGuest()
    setGuestId(guest.id)
    setName(guest.name)
  }, [params])

  function handleJoin() {
    if (!name.trim() || !guestId) return
    setJoining(true)
    updateGuestName(name.trim())
    joinGame({ id: guestId, name: name.trim() })
    router.push(`/nhl-stats-master/${roomId}/player/${guestId}`)
  }

  const avatarUrl = guestId ? getAvatarUrl(guestId) : ''

  return (
    <main className="game-bg-pattern min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <GameLogo className="justify-center mb-2" />
          {roomId && (
            <p className="text-game-text-muted text-sm">
              Joining room <span className="text-ice-blue font-bold">{roomId}</span>
            </p>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-game-card border border-game-card-border rounded-2xl p-6 space-y-6"
        >
          {/* Avatar preview */}
          <div className="flex flex-col items-center gap-3">
            {avatarUrl && (
              <div className="w-20 h-20 rounded-full overflow-hidden bg-game-card-dark border-2 border-game-card-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatarUrl} alt="avatar" width={80} height={80} className="w-full h-full" />
              </div>
            )}
            <p className="text-xs text-game-text-muted">Your avatar (auto-generated)</p>
          </div>

          {/* Name input */}
          <div className="space-y-2">
            <label className="text-sm font-bold uppercase tracking-widest text-game-text-muted">
              Your Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="Enter your name…"
              maxLength={20}
              className="
                w-full bg-game-card-dark border border-game-card-border rounded-xl
                px-4 py-3 text-game-text placeholder-game-text-muted text-lg font-bold
                focus:outline-none focus:border-ice-blue transition-colors text-center
              "
            />
          </div>

          {/* Game info */}
          {game && (
            <div className="bg-game-card-dark rounded-xl p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-game-text-muted">Players</span>
                <span className="font-bold">{game.players?.length ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-game-text-muted">Questions</span>
                <span className="font-bold">{game.questionCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-game-text-muted">Mode</span>
                <span className="font-bold capitalize">{game.answerMode}</span>
              </div>
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleJoin}
            disabled={!name.trim() || joining}
          >
            {joining ? 'Joining…' : '🏒 Join Game'}
          </Button>
        </motion.div>
      </div>
    </main>
  )
}
