import { createClient } from '@liveblocks/client'
import { createRoomContext } from '@liveblocks/react'
import { LiveObject } from '@liveblocks/client'
import type { GameState, UserPresence } from '@/types/game'

const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!,
})

type Storage = {
  game: LiveObject<GameState>
}

export const {
  RoomProvider,
  useStorage,
  useMutation,
  useOthers,
  useSelf,
  useMyPresence,
  useRoom,
  useStatus,
} = createRoomContext<UserPresence, Storage>(client)
