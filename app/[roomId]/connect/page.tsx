'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useStorage } from '@/lib/liveblocks/client'
import { useClaimBoss, useJoinGame } from '@/lib/liveblocks/mutations'
import { getOrCreateGuest, updateGuestName } from '@/lib/guest'
import { getAvatarUrl } from '@/lib/avatar'
import { Button, Kickplate, MonoLabel } from '@/components/design-system'
import { PuckMark, JumbotronPanel } from '@/components/arcade'

const INK = '#0d1b2a'
const RED = '#cf0a2c'

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

  const players = (game?.players ?? []) as { id: string; name: string }[]

  return (
    <main className="ice-bg relative flex min-h-screen flex-col overflow-x-hidden">
      <header className="on-ice-header relative z-20">
        <div className="flex h-[52px] items-center justify-between px-[18px]">
          <div className="flex items-center gap-2.5">
            <PuckMark size={22} />
            <span
              className="font-display"
              style={{ fontWeight: 800, fontSize: 16, letterSpacing: '0.02em' }}
            >
              STATS MASTER
            </span>
          </div>
          <MonoLabel size={9} tracking="0.2em">Joining</MonoLabel>
        </div>
        <Kickplate height={4} />
      </header>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative z-[2] mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center gap-6 px-[18px] py-10"
      >
        {/* Room code on the board — the same object the TV is showing. */}
        <JumbotronPanel bezel={8} screenPad="16px 18px">
          <div className="flex flex-col gap-2.5">
            <span
              className="font-mono"
              style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(255,176,31,0.65)' }}
            >
              ROOM CODE
            </span>
            <span
              className="led-glow"
              style={{
                fontFamily: 'var(--font-led)',
                fontWeight: 700,
                fontSize: 54,
                lineHeight: 0.82,
                letterSpacing: '0.1em',
                color: '#ffb01f',
              }}
            >
              {roomId || '—'}
            </span>
          </div>
        </JumbotronPanel>

        {bossToken && (
          <div
            className="flex flex-col gap-1.5 px-4 py-3"
            style={{ background: RED, color: '#fff' }}
          >
            <span className="font-mono" style={{ fontSize: 9, letterSpacing: '0.22em' }}>
              BOSS LINK
            </span>
            <span
              className="font-display"
              style={{ fontWeight: 700, fontSize: 20, lineHeight: 1, textTransform: 'uppercase' }}
            >
              You control the game
            </span>
          </div>
        )}

        {/* Your jersey: avatar and name. */}
        <div className="on-ice flex flex-col gap-5 p-5" style={{ borderLeft: `5px solid ${INK}` }}>
          <div className="flex items-center gap-4">
            {avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                width={64}
                height={64}
                style={{ width: 64, height: 64, borderRadius: 3, background: '#e4ecf5' }}
              />
            )}
            <div className="flex flex-col gap-1.5">
              <MonoLabel size={9} tracking="0.22em">Your jersey</MonoLabel>
              <span
                className="font-display"
                style={{ fontWeight: 800, fontSize: 30, lineHeight: 1, textTransform: 'uppercase' }}
              >
                {name || '—'}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <MonoLabel size={9} tracking="0.22em">Name on the board</MonoLabel>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              maxLength={14}
              placeholder="YOUR NAME"
              aria-label="Your name"
              className="w-full focus:outline-none"
              style={{
                background: '#ffffff',
                boxShadow: 'inset 0 0 0 2px rgba(13,27,42,0.14)',
                border: 'none',
                borderRadius: 0,
                padding: '14px 16px',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 24,
                lineHeight: 1,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: INK,
              }}
            />
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handleJoin}
            disabled={!name.trim() || joining}
            className="w-full"
            style={{ minHeight: 52 }}
          >
            {joining ? 'Joining…' : 'Take the ice'}
          </Button>
        </div>

        {/* Who is already seated. */}
        {players.length > 0 && (
          <div className="on-ice flex flex-col">
            <div className="px-4 pt-4 pb-2">
              <MonoLabel size={9} tracking="0.22em">
                Already in · {players.length}
              </MonoLabel>
            </div>
            {players.map((p, i) => (
              <div
                key={p.id}
                className="flex items-baseline gap-3 px-4 py-2.5"
                style={{ borderBottom: '1px solid rgba(13,27,42,0.07)' }}
              >
                <span className="font-mono" style={{ fontSize: 9, width: 14, color: '#55677d' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  className="font-display flex-1 truncate"
                  style={{ fontWeight: 700, fontSize: 19, textTransform: 'uppercase', color: INK }}
                >
                  {p.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </main>
  )
}
