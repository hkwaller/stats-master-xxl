'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useStorage } from '@/lib/liveblocks/client'
import { useSaveSettings } from '@/lib/liveblocks/mutations'
import { checkAvailableCount } from '@/app/actions/game-actions'
import { getOrCreateGuest } from '@/lib/guest'
import {
  Panel,
  Button,
  GameHeading,
  GameDivider,
  GameLogo,
} from '@/components/design-system'
import { AdsterraBanner } from '@/components/ads/AdsterraBanner'
import type { AnswerMode, DifficultyTier, GameSetupConfig, RevealMode } from '@/types/game'
import { DEFAULT_SETUP } from '@/types/game'

const TIER_OPTIONS: { tier: DifficultyTier; label: string; desc: string; emoji: string }[] = [
  { tier: 'easy',   label: 'Easy (140+ pts)',   desc: 'Legends like Gretzky & Lemieux', emoji: '⭐' },
  { tier: 'medium', label: 'Medium (120–139)',  desc: 'All-time great seasons',         emoji: '🏆' },
  { tier: 'hard',   label: 'Hard (100–119)',    desc: 'Excellent scorers',              emoji: '🔥' },
  { tier: 'expert', label: 'Expert (70–99)',    desc: 'Solid contributors',             emoji: '🎯' },
]

interface SetupPageProps {
  params: Promise<{ roomId: string }>
}

export default function SetupPage({ params }: SetupPageProps) {
  const router = useRouter()
  const [roomId, setRoomId] = useState('')
  const [myId, setMyId] = useState('')
  const [config, setConfig] = useState<GameSetupConfig>(DEFAULT_SETUP)
  const [starting, setStarting] = useState(false)
  const [availableCount, setAvailableCount] = useState<number | null>(null)

  const game = useStorage((root) => root.game)
  const saveSettings = useSaveSettings()

  useEffect(() => {
    params.then(({ roomId }) => setRoomId(roomId))
    const guest = getOrCreateGuest()
    setMyId(guest.id)
  }, [params])

  useEffect(() => {
    let active = true
    async function fetchCount() {
      if (config.difficultyTiers.length === 0 || config.eras.length === 0) {
        if (active) setAvailableCount(0)
        return
      }
      const ct = await checkAvailableCount(config.difficultyTiers, config.eras)
      if (active) setAvailableCount(ct)
    }
    fetchCount()
    return () => { active = false }
  }, [config.difficultyTiers, config.eras])

  const isHost = game?.hostId === myId || game?.hostId === ''

  function toggle<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]
  }

  function handleStart() {
    if (!isHost || config.difficultyTiers.length === 0) return
    setStarting(true)
    saveSettings({ config, requesterId: myId })
    router.push(`/nhl-stats-master/${roomId}/lobby`)
  }

  return (
    <main className="game-bg-pattern min-h-screen px-4 py-8">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <GameLogo />
          <div className="text-right">
            <p className="text-xs text-game-text-muted uppercase tracking-wide">Room</p>
            <p className="text-xl font-bold tracking-widest text-ice-blue">{roomId}</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Panel className="p-6 space-y-6">
            <GameHeading>Game Setup</GameHeading>

            {!isHost && (
              <p className="text-game-text-muted text-sm text-center italic">
                Waiting for the host to configure…
              </p>
            )}

            {/* Question count */}
            <div className="space-y-3">
              <p className="text-sm font-bold uppercase tracking-widest text-black">
                Questions
              </p>
              <div className="flex gap-2">
                {[5, 10, 15, 20].map((n) => (
                  <button
                    key={n}
                    disabled={!isHost}
                    onClick={() => setConfig((c) => ({ ...c, questionCount: n }))}
                    className={`
                      flex-1 py-2.5 border-2 border-black font-bold text-sm transition-all shadow-[2px_2px_0_#000]
                      ${config.questionCount === n
                        ? 'bg-cyan text-black shadow-[4px_4px_0_#000] translate-x-[-2px] translate-y-[-2px]'
                        : 'bg-white text-black hover:bg-cyan/50'
                      }
                      disabled:cursor-not-allowed
                    `}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <GameDivider />

            {/* Reveal mode */}
            <div className="space-y-3">
              <p className="text-sm font-bold uppercase tracking-widest text-black">
                Stats Reveal
              </p>
              <div className="flex gap-2">
                {([
                  { value: 'instant', label: '⚡ All at Once',   desc: 'See all stats immediately' },
                  { value: 'timed',   label: '⏱ Timed Reveal', desc: 'Columns reveal every 8s' },
                ] as { value: RevealMode; label: string; desc: string }[]).map(({ value, label, desc }) => (
                  <button
                    key={value}
                    disabled={!isHost}
                    onClick={() => setConfig((c) => ({ ...c, revealMode: value }))}
                    className={`
                      flex-1 py-3 border-2 border-black text-sm transition-all text-left px-3 shadow-[2px_2px_0_#000]
                      ${config.revealMode === value
                        ? 'bg-magenta text-white shadow-[4px_4px_0_#000] translate-x-[-2px] translate-y-[-2px]'
                        : 'bg-white text-black hover:bg-magenta/20'
                      }
                      disabled:cursor-not-allowed
                    `}
                  >
                    <div className="font-bold">{label}</div>
                    <div className="text-xs mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <GameDivider />

            {/* Answer mode */}
            <div className="space-y-3">
              <p className="text-sm font-bold uppercase tracking-widest text-black">
                Answer Mode
              </p>
              <div className="flex gap-2">
                {([
                  { value: 'multiplechoice', label: '🔘 Multiple Choice' },
                  { value: 'freetext',       label: '✏️ Free Text' },
                ] as { value: AnswerMode; label: string }[]).map(({ value, label }) => (
                  <button
                    key={value}
                    disabled={!isHost}
                    onClick={() => setConfig((c) => ({ ...c, answerMode: value }))}
                    className={`
                      flex-1 py-2.5 border-2 border-black font-bold text-sm transition-all shadow-[2px_2px_0_#000]
                      ${config.answerMode === value
                        ? 'bg-yellow text-black shadow-[4px_4px_0_#000] translate-x-[-2px] translate-y-[-2px]'
                        : 'bg-white text-black hover:bg-yellow/50'
                      }
                      disabled:cursor-not-allowed
                    `}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <GameDivider />

            {/* Difficulty tiers */}
            <div className="space-y-3">
              <p className="text-sm font-bold uppercase tracking-widest text-game-text-muted">
                Difficulty
              </p>
              <div className="space-y-2">
                {TIER_OPTIONS.map(({ tier, label, desc, emoji }) => {
                  const selected = config.difficultyTiers.includes(tier)
                  return (
                    <button
                      key={tier}
                      disabled={!isHost}
                      onClick={() =>
                        setConfig((c) => ({
                          ...c,
                          difficultyTiers: toggle(c.difficultyTiers, tier),
                        }))
                      }
                      className={`
                        w-full flex items-center gap-3 px-4 py-3 border-2 border-black
                        text-left transition-all shadow-[2px_2px_0_#000]
                        ${selected
                          ? 'bg-lime text-black shadow-[4px_4px_0_#000] translate-x-[-2px] translate-y-[-2px]'
                          : 'bg-white text-black hover:bg-lime/20'
                        }
                        disabled:cursor-not-allowed
                      `}
                    >
                      <span className="text-xl">{emoji}</span>
                      <div className="flex-1">
                        <div className="font-bold text-sm text-black">{label}</div>
                        <div className="text-xs text-black/80 font-bold">{desc}</div>
                      </div>
                      <div
                        className={`
                          w-6 h-6 border-2 border-black flex items-center justify-center shadow-[1px_1px_0_#000]
                          ${selected ? 'bg-magenta border-black' : 'bg-white'}
                        `}
                      >
                        {selected && <span className="text-white text-md font-bold">✓</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
              {config.difficultyTiers.length === 0 && (
                <p className="text-game-red text-xs">Select at least one difficulty tier</p>
              )}
            </div>

            <GameDivider />

            {/* Eras */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <p className="text-sm font-bold uppercase tracking-widest text-black">
                  Eras
                </p>
                {availableCount !== null && (
                  <p className="text-xs font-bold font-mono bg-yellow border-2 border-black px-2 shadow-[2px_2px_0_#000]">
                    Pool: {availableCount} players
                  </p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['1970s', '1980s', '1990s', '2000s', '2010s', '2020s'].map((era) => {
                  const selected = config.eras.includes(era)
                  return (
                    <button
                      key={era}
                      disabled={!isHost}
                      onClick={() =>
                        setConfig((c) => ({
                          ...c,
                          eras: toggle(c.eras, era),
                        }))
                      }
                      className={`
                        py-2 text-center font-bold text-sm border-2 border-black shadow-[2px_2px_0_#000]
                        transition-all
                        ${selected 
                          ? 'bg-cyan text-black shadow-[4px_4px_0_#000] translate-x-[-2px] translate-y-[-2px]' 
                          : 'bg-white text-black hover:bg-cyan/30'
                        }
                        disabled:cursor-not-allowed
                      `}
                    >
                      {era}
                    </button>
                  )
                })}
              </div>
              {config.eras.length === 0 && (
                <p className="text-game-red text-xs">Select at least one era</p>
              )}
            </div>

            <GameDivider />

            {/* Hints & Powerups */}
            <div className="flex gap-4">
              {([
                { key: 'hintsEnabled',    label: '💡 Hints',    desc: '-10 pts each' },
                { key: 'powerupsEnabled', label: '⚡ Powerups', desc: '1 charge each' },
              ] as { key: keyof GameSetupConfig; label: string; desc: string }[]).map(({ key, label, desc }) => (
                <button
                  key={key}
                  disabled={!isHost}
                  onClick={() => setConfig((c) => ({ ...c, [key]: !c[key] }))}
                  className={`
                    flex-1 flex flex-col items-center gap-1 py-3 px-2 border-2 border-black shadow-[2px_2px_0_#000]
                    transition-all text-sm
                    ${config[key]
                      ? 'bg-cyan text-black shadow-[4px_4px_0_#000] translate-x-[-2px] translate-y-[-2px]'
                      : 'bg-white text-black hover:bg-cyan/30'
                    }
                    disabled:cursor-not-allowed
                  `}
                >
                  <span className="font-bold text-black">{label}</span>
                  <span className="text-xs text-black/80 font-bold">{desc}</span>
                </button>
              ))}
            </div>

            {/* Start button */}
            {isHost && (
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleStart}
                disabled={starting || config.difficultyTiers.length === 0 || config.eras.length === 0 || (availableCount !== null && availableCount < config.questionCount)}
              >
                {starting ? 'Starting…' : (availableCount !== null && availableCount < config.questionCount) ? 'Not enough players' : '🏒 Continue to Lobby'}
              </Button>
            )}
          </Panel>
        </motion.div>

        <AdsterraBanner slot="setup" />
      </div>
    </main>
  )
}
