'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useStorage } from '@/lib/liveblocks/client'
import { useClaimBoss, useJoinGame } from '@/lib/liveblocks/mutations'
import { getOrCreateGuest, updateGuestName } from '@/lib/guest'
import { getAvatarUrl } from '@/lib/avatar'
import { Button } from '@/components/design-system'
import { CBrand } from '@/components/arcade'

interface ConnectPageProps {
  params: Promise<{ roomId: string }>
}

export default function ConnectPage({ params }: ConnectPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [roomId, setRoomId] = useState('')
  const [name, setName] = useState('')
  const [guestId, setGuestId] = useState('')
  const [joining, setJoining] = useState(false)

  const game = useStorage((root) => root.game)
  const joinGame = useJoinGame()
  const claimBoss = useClaimBoss()

  const bossToken = searchParams.get('boss')

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
    if (bossToken) {
      claimBoss({ playerId: guestId, token: bossToken })
    }
    router.push(`/${roomId}/player/${guestId}`)
  }

  const avatarUrl = guestId ? getAvatarUrl(guestId) : ''

  const caption: React.CSSProperties = {
    fontFamily: 'var(--font-jetbrains-mono), "JetBrains Mono", monospace',
    fontSize: 11,
    letterSpacing: '0.18em',
    color: '#6b7ea0',
    textTransform: 'uppercase',
  }

  return (
    <main className="ice-bg min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-5">
        {/* Brand + caption */}
        <div className="flex flex-col items-center text-center gap-2">
          <CBrand />
          {roomId && (
            <p style={caption}>
              JOINING ROOM · <span style={{ color: '#0a1535' }}>{roomId}</span>
            </p>
          )}
        </div>

        {/* Boss invite banner */}
        {bossToken && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
            style={{
              background: '#ffcf33',
              border: '2px solid #0a1535',
              borderRadius: 14,
              boxShadow: '0 4px 0 #0a1535',
              padding: '12px 16px',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-archivo-black), "Archivo Black", sans-serif',
                fontSize: 12,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#0a1535',
                margin: 0,
              }}
            >
              👑 Boss Invite
            </p>
            <p
              style={{
                fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif',
                fontSize: 13,
                color: '#0a1535',
                marginTop: 3,
              }}
            >
              You&apos;ll have host controls after joining.
            </p>
          </motion.div>
        )}

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            background: '#ffffff',
            border: '2px solid #0a1535',
            borderRadius: 16,
            boxShadow: '0 5px 0 #0a1535',
            padding: 20,
          }}
        >
          {/* Avatar preview */}
          <div className="flex flex-col items-center gap-2">
            {avatarUrl && (
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '3px solid #0a1535',
                  background: '#eaf2ff',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatarUrl} alt="avatar" width={76} height={76} className="w-full h-full" />
              </div>
            )}
            <p style={caption}>Your Avatar · Auto-Generated</p>
          </div>

          {/* Name input */}
          <div className="mt-4">
            <label
              style={{
                display: 'block',
                fontFamily: 'var(--font-archivo-black), "Archivo Black", sans-serif',
                fontSize: 11,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: '#0a1535',
                marginBottom: 6,
              }}
            >
              Your Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="Enter your name…"
              maxLength={20}
              className="w-full focus:outline-none"
              style={{
                background: '#eaf2ff',
                border: '3px solid #0a1535',
                borderRadius: 12,
                padding: '0 14px',
                minHeight: 44,
                fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
                fontSize: 17,
                color: '#0a1535',
                textAlign: 'center',
              }}
            />
          </div>

          {/* Game info */}
          {game && (
            <div
              className="mt-4"
              style={{ background: '#eef1f8', borderRadius: 12, padding: 14 }}
            >
              {[
                { label: 'Players', value: String(game.players?.length ?? 0) },
                { label: 'Questions', value: String(game.questionCount) },
                { label: 'Mode', value: game.gameMode },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex justify-between items-center"
                  style={{ padding: '3px 0' }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-space-grotesk), "Space Grotesk", sans-serif',
                      fontSize: 14,
                      color: '#6b7ea0',
                    }}
                  >
                    {row.label}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
                      fontSize: 14,
                      color: '#0a1535',
                      textTransform: 'uppercase',
                    }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Join button */}
          <Button
            variant="primary"
            className="w-full mt-4"
            onClick={handleJoin}
            disabled={!name.trim() || joining}
            style={{ minHeight: 44, fontSize: 15, boxShadow: '0 5px 0 #0a1535' }}
          >
            {joining ? 'Joining…' : 'LACE UP → JOIN'}
          </Button>
        </motion.div>
      </div>
    </main>
  )
}
