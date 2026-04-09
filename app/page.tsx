'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { nanoid } from 'nanoid'
import { SignInButton, useAuth, UserButton } from '@clerk/nextjs'
import { GameLogo, Button, GameDivider } from '@/components/design-system'
import { AdsterraBanner } from '@/components/ads/AdsterraBanner'
import { DailyChallenge } from '@/components/game/DailyChallenge'

export default function LandingPage() {
  const router = useRouter()
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const { isSignedIn, isLoaded } = useAuth()

  function handleCreate() {
    const roomId = nanoid(6).toUpperCase()
    router.push(`/${roomId}/setup`)
  }

  function handleJoin() {
    const code = joinCode.trim().toUpperCase()
    if (code.length < 4) {
      setError('Enter a valid room code')
      return
    }
    router.push(`/${code}/lobby`)
  }

  return (
    <main className="game-bg-pattern min-h-screen flex flex-col items-center justify-center px-4 py-12 pb-40">
      {/* Animated background particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[
          'var(--color-magenta)',
          'var(--color-cyan)',
          'var(--color-yellow)',
          'var(--color-lime)',
          'var(--color-magenta)',
          'var(--color-cyan)',
          'var(--color-yellow)',
          'var(--color-lime)',
        ].map((color, i) => (
          <motion.div
            key={i}
            className={`absolute border-4 border-black shadow-[4px_4px_0_#000] ${i % 2 === 0 ? 'rounded-full' : 'rounded-none'}`}
            style={{
              backgroundColor: color,
              width: ((i % 3) + 1) * 30,
              height: ((i % 3) + 1) * 30,
            }}
            initial={{
              x: `${Math.random() * 100}vw`,
              y: `${Math.random() * 100}vh`,
              rotate: 0,
            }}
            animate={{
              x: [`${Math.random() * 100}vw`, `${Math.random() * 100}vw`],
              y: [`${Math.random() * 100}vh`, `${Math.random() * 100}vh`],
              rotate: [0, 360],
            }}
            transition={{
              duration: 8 + Math.random() * 8,
              repeat: Infinity,
              repeatType: 'mirror',
              ease: 'linear',
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-5xl flex flex-col gap-10">
        {/* Row 1: Logo + Auth */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div>
              <GameLogo className="text-4xl mb-1" />
              <p className="text-black font-bold bg-cyan border-2 border-black px-3 py-1 rotate-1 inline-block text-xs tracking-widest uppercase shadow-[4px_4px_0_#000]">
                Multiplayer NHL Trivia
              </p>
            </div>
          </div>

          {isLoaded &&
            (isSignedIn ? (
              <UserButton />
            ) : (
              <SignInButton mode="modal">
                <button className="font-mono font-bold border-4 border-black px-4 py-2 bg-white shadow-[4px_4px_0_#000] hover:bg-yellow transition-colors uppercase tracking-wider cursor-pointer text-sm">
                  Sign In
                </button>
              </SignInButton>
            ))}
        </motion.div>

        {/* Row 2: Game setup + Daily Challenge */}
        <div className="grid md:grid-cols-2 gap-12 items-start">
          {/* Left: Create / Join */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
            className="space-y-6"
          >
            <div className="bg-white border-8 border-black rounded-sm p-6 space-y-6 shadow-[16px_16px_0px_#000] rotate-[-1deg]">
              <div>
                <Button variant="primary" size="lg" className="w-full" onClick={handleCreate}>
                  Create New Game
                </Button>
                <p className="text-center text-sm font-bold text-black mt-4 border-2 border-black bg-yellow inline-block px-2 transform -rotate-1 shadow-[2px_2px_0_#000]">
                  Host a game — share the code with friends
                </p>
              </div>

              <GameDivider />

              <div className="space-y-3">
                <p className="text-center text-sm font-bold uppercase tracking-widest text-white bg-magenta border-2 border-black px-2 py-1 transform rotate-1 shadow-[2px_2px_0_#000] inline-block">
                  Join with a code
                </p>
                <div className="flex gap-2">
                  <input
                    value={joinCode}
                    onChange={(e) => {
                      setJoinCode(e.target.value.toUpperCase())
                      setError('')
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                    placeholder="ROOM CODE"
                    maxLength={8}
                    className="
                      flex-1 bg-white border-1 border-black rounded-sm
                      px-4 py-3 text-center text-xl font-display font-bold tracking-widest
                      text-black placeholder-game-text-muted shadow-[4px_4px_0_#000]
                      focus:outline-none focus:bg-yellow transition-colors uppercase
                    "
                  />
                  <Button variant="secondary" size="md" onClick={handleJoin}>
                    Join
                  </Button>
                </div>
                {error && <p className="text-game-red text-sm text-center">{error}</p>}
              </div>
            </div>

            <AdsterraBanner slot="landing" />
          </motion.div>

          {/* Right: Daily Challenge */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
          >
            <DailyChallenge />
          </motion.div>
        </div>

        {/* Row 3: What is NHL Stats Master */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
          className="bg-white border-8 border-black rounded-sm p-8 shadow-[16px_16px_0px_#000] rotate-[1deg]"
        >
          <h2 className="text-4xl font-display font-bold uppercase mb-4 text-black">
            What is NHL Stats Master?
          </h2>
          <p className="text-black font-mono font-bold mb-4">
            A chaotic, multiplayer trivia game where you guess NHL players based entirely on their
            seasonal stats.
          </p>
          <ul className="list-disc pl-5 font-mono font-bold text-black space-y-3 mb-6">
            <li>Create a room and share the code.</li>
            <li>Use your phone as the controller while the main screen hosts the game.</li>
            <li>Outsmart your friends and answer before the countdown finishes!</li>
          </ul>
          <div className="bg-lime p-4 rotate-[-1deg] shadow-[4px_4px_0_#000]">
            <p className="text-black font-bold uppercase tracking-widest text-sm text-center">
              Do you know your hockey history?
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  )
}
