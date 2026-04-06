'use client'

import { useEffect, useState } from 'react'
import { GameRoomProvider } from '@/lib/liveblocks/GameRoomProvider'
import { getOrCreateGuest } from '@/lib/guest'

interface ClientLayoutProps {
  roomId: string
  children: React.ReactNode
}

export function ClientLayout({ roomId, children }: ClientLayoutProps) {
  const [hostId, setHostId] = useState<string | null>(null)

  useEffect(() => {
    const guest = getOrCreateGuest()
    setHostId(guest.id)
  }, [])

  if (!hostId) return null

  return (
    <GameRoomProvider roomId={roomId} hostId={hostId}>
      {children}
    </GameRoomProvider>
  )
}
