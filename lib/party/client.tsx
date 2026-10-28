'use client'

import { createContext, useCallback, useContext } from 'react'
import type { GameState } from '../../types/game'
import type { ActionArgs, ActionType, RoomAction } from './protocol'

export type RoomStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'
export type RoomContextValue = {
  game: GameState | null
  status: RoomStatus
  send: (action: RoomAction) => void
}
export const RoomContext = createContext<RoomContextValue | null>(null)
export function useRoom() {
  const room = useContext(RoomContext)
  if (!room) throw new Error('GameRoomProvider is missing')
  return room
}

/** Keeps the selector contract used by game screens. The Worker supplies snapshots. */
export function useStorage<T>(select: (root: { game: GameState }) => T): T | null {
  const { game } = useRoom()
  return game ? select({ game }) : null
}
export function useRoomStatus() {
  return useRoom().status
}
export function useAction<K extends ActionType>(type: K) {
  const { send } = useRoom()
  return useCallback((args: ActionArgs<K>) => send({ type, args } as RoomAction), [type, send])
}
