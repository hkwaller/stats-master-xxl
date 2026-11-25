'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useStorage } from '@/lib/party/client'
import { useClaimBoss, useJoinGame, useSetJersey } from '@/lib/party/mutations'
import { getOrCreateGuest, updateGuestName } from '@/lib/guest'
import { defaultJersey, nextFreeNumber } from '@/lib/jersey'
import { loadSavedJersey, saveJersey } from '@/lib/jersey-storage'
import type { Jersey as JerseyData, Player } from '@/types/game'
import { Button, Kickplate, MonoLabel } from '@/components/design-system'
import { PuckMark, JumbotronPanel } from '@/components/arcade'
import { Jersey } from '@/components/game/Jersey'
import { SweaterPicker } from '@/components/game/SweaterPicker'

const INK = '#14213d'
const RED = '#2357ff'

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
  const [picked, setPicked] = useState<JerseyData | null>(null)

  const game = useStorage((root) => root.game)
  const joinGame = useJoinGame()
  const setJersey = useSetJersey()
  const claimBoss = useClaimBoss()

  const players = (game?.players ?? []) as Player[]
  const others = players.filter((p) => p.id !== guestId)
  const taken = new Set(others.flatMap((p) => (p.jersey ? [p.jersey.number] : [])))
  const takenBy = others
    .filter((p) => p.jersey)
    .sort((a, b) => a.jersey!.number - b.jersey!.number)
    .map((p) => `${p.jersey!.number} ${p.name}`)
    .join(' · ')

  // Your saved sweater (or a starter one), with its number moved off any clash.
  const base = picked ?? (guestId ? (loadSavedJersey() ?? defaultJersey(guestId)) : null)
  const jersey = base && taken.has(base.number)
    ? { ...base, number: nextFreeNumber(base.number, taken) }
    : base

  const bossToken = searchParams.get('boss')

  useEffect(() => {
    params.then(({ roomId }) => setRoomId(roomId))
    const guest = getOrCreateGuest()
    setGuestId(guest.id)
    setName(guest.name ?? '')
  }, [params])

  function handleJoin() {
    if (!name.trim() || !guestId || !jersey) return
    setJoining(true)
    updateGuestName(name.trim())
    saveJersey(jersey)
    joinGame({ id: guestId, name: name.trim(), jersey })
    // Already in the room (a rejoin): the join is ignored, so update the sweater directly.
    if (players.some((p) => p.id === guestId)) setJersey({ playerId: guestId, jersey })
    if (bossToken) {
      claimBoss({ playerId: guestId, token: bossToken })
    }
    router.push(
      searchParams.get('returnTo') === 'lobby'
        ? `/${roomId}/lobby`
        : `/${roomId}/player/${guestId}`,
    )
  }

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
          <MonoLabel size={9} tracking="0.2em">
            Joining
          </MonoLabel>
        </div>
        <Kickplate height={4} />
      </header>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative z-[2] mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center gap-6 px-[18px] py-10"
      >
        {/* Room code on the board - the same object the TV is showing. */}
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
              {roomId || '-'}
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

        {/* Your sweater: the preview updates as you pick. */}
        <div className="on-ice flex flex-col gap-5 p-5">
          <div className="flex items-center gap-4">
            {jersey && (
              <div style={{ transform: 'rotate(-3deg)' }}>
                <Jersey jersey={jersey} name={name || undefined} size={120} />
              </div>
            )}
            <div className="flex min-w-0 flex-col gap-1.5">
              <MonoLabel>Pick your sweater</MonoLabel>
              <span
                className="font-display truncate"
                style={{ fontSize: 34, lineHeight: 1, textTransform: 'uppercase' }}
              >
                {name || '-'}
              </span>
              {jersey && <MonoLabel color="var(--color-ink)">No. {jersey.number}</MonoLabel>}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <MonoLabel size={9} tracking="0.22em">
              Name on the board
            </MonoLabel>
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
                border: '3px solid var(--color-ink)',
                borderRadius: 14,
                padding: '12px 16px',
                fontFamily: 'var(--font-display)',
                fontWeight: 400,
                fontSize: 26,
                lineHeight: 1,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: INK,
              }}
            />
          </div>

          {jersey && (
            <SweaterPicker jersey={jersey} onChange={setPicked} taken={taken} takenBy={takenBy} />
          )}

          <Button
            variant="primary"
            size="md"
            onClick={handleJoin}
            disabled={!name.trim() || joining}
            className="w-full"
            style={{ minHeight: 52 }}
          >
            {joining ? 'Joining…' : 'Hit the ice'}
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
                className="flex items-center gap-3 px-4 py-2"
                style={{ borderBottom: '1px solid rgba(20, 33, 61,0.07)' }}
              >
                {p.jersey ? (
                  <Jersey jersey={p.jersey} size={32} decorative />
                ) : (
                  <span className="font-mono" style={{ fontSize: 11, width: 32, color: '#4a5a78' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                )}
                <span
                  className="font-display flex-1 truncate"
                  style={{ fontSize: 21, textTransform: 'uppercase', color: INK }}
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
