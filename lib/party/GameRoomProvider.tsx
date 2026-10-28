'use client'

import PartySocket from 'partysocket'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { RoomContext, type RoomStatus } from './client'
import { applyRoomAction } from './reducer'
import type { GameState } from '../../types/game'
import type { RoomAction, RoomMessage } from './protocol'

export function GameRoomProvider({
  roomId,
  hostId,
  children,
}: {
  roomId: string
  hostId: string
  children: ReactNode
}) {
  const [room, setRoom] = useState<{ game: GameState | null; online: string[] }>({
    game: null,
    online: [],
  })
  const [status, setStatus] = useState<RoomStatus>('connecting')
  const socket = useRef<PartySocket | null>(null)

  useEffect(() => {
    const host = process.env.NEXT_PUBLIC_PARTY_HOST
    setRoom({ game: null, online: [] })
    if (!host) {
      setStatus('disconnected')
      return
    }
    let active = true
    let opened = false
    setStatus('connecting')
    const s = new PartySocket({
      host,
      party: 'room',
      room: roomId,
      query: async () => {
        const res = await fetch('/api/party-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room: roomId, guestId: hostId }),
        })
        if (!res.ok) {
          if (active) setStatus('disconnected')
          throw new Error(`Room authorization failed: ${res.status}`)
        }
        return { ticket: ((await res.json()) as { ticket: string }).ticket }
      },
    })
    s.addEventListener('open', () => {
      if (active) {
        opened = true
        setStatus('connected')
      }
    })
    s.addEventListener('close', () => {
      if (active) setStatus(opened ? 'reconnecting' : 'connecting')
    })
    s.addEventListener('message', (e) => {
      if (!active) return
      try {
        const msg = JSON.parse(String(e.data)) as RoomMessage
        if (msg.type === 'state') setRoom({ game: msg.state, online: msg.online })
      } catch {
        /* Ignore malformed messages. */
      }
    })
    socket.current = s
    return () => {
      active = false
      s.close()
      socket.current = null
    }
  }, [roomId, hostId])

  // Commands carry the round they were created for. A reconnect cannot replay a
  // stale answer or timer callback into the next round. Server snapshots always win.
  const gameRef = useRef(room.game)
  gameRef.current = room.game
  const send = useCallback(
    (action: RoomAction) => {
      const game = gameRef.current
      if (!game || !socket.current) return
      socket.current.send(
        JSON.stringify({ ...action, round: game.currentQuestionIndex, session: game.session }),
      )
      // Keep controls responsive; random choices must come from the server.
      if (
        action.type === 'startGame' ||
        (action.type === 'activatePowerup' && action.args.powerupType === 'eliminate')
      )
        return
      setRoom((current) =>
        current.game
          ? {
              ...current,
              game: applyRoomAction(current.game, hostId, new Set(current.online), action),
            }
          : current,
      )
    },
    [hostId],
  )
  const game = useMemo(
    () =>
      room.game
        ? {
            ...room.game,
            players: room.game.players.map((p) => ({
              ...p,
              isConnected: room.online.includes(p.id),
            })),
          }
        : null,
    [room],
  )
  const value = useMemo(() => ({ game, status, send }), [game, status, send])

  return (
    <RoomContext.Provider value={value}>
      {room.game ? (
        <>
          {status !== 'connected' && (
            <div role="status" className="fixed top-0 z-50 w-full bg-white p-2 text-center text-sm">
              Reconnecting to the room…
            </div>
          )}
          {children}
        </>
      ) : (
        <div className="ice-bg flex min-h-screen items-center justify-center">
          <p role="status" className="relative z-[2] font-mono text-sm">
            {status === 'disconnected'
              ? 'Room service unavailable. Please try again.'
              : 'Taking the ice…'}
          </p>
        </div>
      )}
    </RoomContext.Provider>
  )
}
