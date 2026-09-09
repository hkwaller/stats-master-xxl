'use client'

import { ReactNode } from 'react'
import { nanoid } from 'nanoid'
import { RoomProvider } from './client'
import { ClientSideSuspense } from '@liveblocks/react'
import { LiveList, LiveObject } from '@liveblocks/client'
import type { GameState } from '@/types/game'

function createInitialGameState(roomId: string, hostId: string): GameState {
  return {
    roomId,
    hostId,
    bossId: '',
    bossToken: nanoid(12),
    hostPlays: true,
    players: [],
    command: 'idle',
    countdownTime: 3,
    reveal: false,
    hostAdFree: false,
    // Mode
    gameMode: 'classic',
    // Setup
    questionCount: 10,
    answerMode: 'multiplechoice',
    difficultyTiers: ['easy', 'medium'],
    revealMode: 'timed',
    hintsEnabled: true,
    powerupsEnabled: true,
    rookiesOnly: false,
    careerRevealOrder: 'best-first',
    careerMinSeasons: 5,
    careerMaxReveals: 8,
    hlComparisonField: 'points',
    eras: [],
    // Classic sequence
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
    playerEliminatedChoices: {},
    freezeActive: false,
    playedQuestions: [],
    questionHistory: [],
    // Career mode
    careerData: [],
    careerSeasons: [],
    revealedSeasonCount: 0,
    buzzedInPlayerId: '',
    buzzedInSeasonCount: 0,
    lockedOutPlayers: [],
    // H2H mode
    h2hPairs: [],
    h2hCurrentPair: null,
    // Higher/Lower mode
    hlPairs: [],
    hlCurrentPair: null,
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
          <div className="ice-bg flex min-h-screen items-center justify-center">
            <p className="font-mono animate-pulse relative z-[2] text-[10px] uppercase tracking-[0.24em] text-[#55677d]">
              Taking the ice
            </p>
          </div>
        }
      >
        {() => children}
      </ClientSideSuspense>
    </RoomProvider>
  )
}
