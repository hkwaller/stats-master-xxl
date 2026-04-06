'use client'

import { ReactNode } from 'react'
import { RoomProvider } from './client'
import { ClientSideSuspense } from '@liveblocks/react'
import { LiveList, LiveObject } from '@liveblocks/client'
import type { GameState } from '@/types/game'

function createInitialGameState(roomId: string, hostId: string): GameState {
  return {
    roomId,
    hostId,
    bossId: '',
    bossToken: '',
    players: [],
    command: 'idle',
    countdownTime: 3,
    reveal: false,
    questionCount: 10,
    answerMode: 'multiplechoice',
    difficultyTiers: ['easy', 'medium'],
    revealMode: 'timed',
    hintsEnabled: true,
    powerupsEnabled: true,
    questionSequence: [],
    currentQuestion: null,
    currentQuestionIndex: -1,
    revealedColumns: 0,
    questionStartsAt: '',
    choices: [],
    answers: {},
    answeredAt: {},
    hintsUsed: [],
    playerPowerups: {},
    activePowerup: null,
    eliminatedChoices: [],
    freezeActive: false,
    playedQuestions: [],
    questionHistory: [],
  }
}

interface GameRoomProviderProps {
  roomId: string
  hostId: string
  children: ReactNode
}

export function GameRoomProvider({ roomId, hostId, children }: GameRoomProviderProps) {
  const liveblocksRoomId = `nhl-stats-master-${roomId}`

  return (
    <RoomProvider
      id={liveblocksRoomId}
      initialPresence={{
        isConnected: true,
        lastSeen: new Date().toISOString(),
      }}
      initialStorage={{
        game: new LiveObject({
          ...createInitialGameState(roomId, hostId),
          players: new LiveList([]),
          playedQuestions: new LiveList([]),
        } as unknown as GameState),
      }}
    >
      <ClientSideSuspense
        fallback={
          <div className="flex items-center justify-center min-h-screen bg-game-bg">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-ice-blue border-t-transparent rounded-full animate-spin" />
              <p className="text-game-text-muted text-lg tracking-widest uppercase">Loading…</p>
            </div>
          </div>
        }
      >
        {() => children}
      </ClientSideSuspense>
    </RoomProvider>
  )
}
