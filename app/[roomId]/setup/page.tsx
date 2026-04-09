'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useStorage } from '@/lib/liveblocks/client'
import { useSaveSettings } from '@/lib/liveblocks/mutations'
import { checkAvailableCount, checkCareerPlayerCount } from '@/app/actions/game-actions'
import { getOrCreateGuest } from '@/lib/guest'
import { Panel, Button, GameHeading, GameDivider, GameLogo } from '@/components/design-system'
import { AdsterraBanner } from '@/components/ads/AdsterraBanner'
import type {
  AnswerMode,
  CareerRevealOrder,
  DifficultyTier,
  GameMode,
  GameSetupConfig,
  HLComparisonField,
  RevealMode,
} from '@/types/game'
import { DEFAULT_SETUP } from '@/types/game'

// ─── Constants ────────────────────────────────────────────────────────────────

const TIER_OPTIONS: {
  tier: DifficultyTier
  label: string
  desc: string
  emoji: string
}[] = [
  {
    tier: 'easy',
    label: 'Easy (140+ pts)',
    desc: 'Legends like Gretzky & Lemieux',
    emoji: '⭐',
  },
  {
    tier: 'medium',
    label: 'Medium (120–139)',
    desc: 'All-time great seasons',
    emoji: '🏆',
  },
  {
    tier: 'hard',
    label: 'Hard (100–119)',
    desc: 'Excellent scorers',
    emoji: '🔥',
  },
  {
    tier: 'expert',
    label: 'Expert (70–99)',
    desc: 'Solid contributors',
    emoji: '🎯',
  },
]

const GAME_MODES: { mode: GameMode; label: string; desc: string }[] = [
  {
    mode: 'classic',
    label: 'Classic',
    desc: 'Guess the player from a single season',
  },
  {
    mode: 'career',
    label: 'Career',
    desc: 'Career seasons revealed one by one — buzz in!',
  },
  {
    mode: 'h2h',
    label: 'Head-to-Head',
    desc: 'Which stat line belongs to this player?',
  },
  {
    mode: 'higher-lower',
    label: 'Higher or Lower',
    desc: 'Did the challenge player score more or less?',
  },
]

const HL_FIELDS: { value: HLComparisonField; label: string }[] = [
  { value: 'points', label: 'Points' },
  { value: 'goals', label: 'Goals' },
  { value: 'assists', label: 'Assists' },
  { value: 'penaltyMinutes', label: 'Penalty Minutes' },
  { value: 'gamesPlayed', label: 'Games Played' },
]

const CAREER_REVEAL_ORDERS: { value: CareerRevealOrder; label: string }[] = [
  { value: 'best-first', label: 'Best First' },
  { value: 'worst-first', label: 'Worst First' },
  { value: 'chronological', label: 'Chronological' },
  { value: 'random', label: 'Random' },
]

// ─── Component ────────────────────────────────────────────────────────────────

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

  // Live pool count — mode-aware
  useEffect(() => {
    let active = true
    async function fetchCount() {
      if (config.eras.length === 0) {
        if (active) setAvailableCount(0)
        return
      }

      if (config.gameMode === 'career') {
        const ct = await checkCareerPlayerCount(
          config.careerMinSeasons,
          config.eras,
          config.difficultyTiers.length > 0 ? config.difficultyTiers : undefined,
        )
        if (active) setAvailableCount(ct)
      } else {
        if (config.difficultyTiers.length === 0) {
          if (active) setAvailableCount(0)
          return
        }
        const ct = await checkAvailableCount(
          config.difficultyTiers,
          config.eras,
          config.gameMode === 'classic' ? config.rookiesOnly : false,
        )
        if (active) setAvailableCount(ct)
      }
    }
    fetchCount()
    return () => {
      active = false
    }
  }, [
    config.gameMode,
    config.difficultyTiers,
    config.eras,
    config.rookiesOnly,
    config.careerMinSeasons,
  ])

  const isHost = game?.hostId === myId || game?.hostId === ''

  function toggle<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]
  }

  function handleStart() {
    if (!isHost) return
    if (config.eras.length === 0) return
    if (config.difficultyTiers.length === 0) return
    setStarting(true)
    saveSettings({ config, requesterId: myId })
    router.push(`/${roomId}/lobby`)
  }

  const isClassic = config.gameMode === 'classic'
  const isCareer = config.gameMode === 'career'
  const isH2H = config.gameMode === 'h2h'
  const isHL = config.gameMode === 'higher-lower'

  const needsTiers = isClassic || isH2H || isHL || isCareer
  const canStart =
    isHost &&
    config.eras.length > 0 &&
    (!needsTiers || config.difficultyTiers.length > 0) &&
    (availableCount === null || availableCount >= (isCareer ? 1 : config.questionCount))

  return (
    <main className="game-bg-pattern min-h-screen px-4 py-8">
      <div className="max-w-lg md:max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <GameLogo />
          <div className="text-right">
            <p className="text-xs text-game-text-muted uppercase tracking-wide">Room</p>
            <p className="text-xl font-bold tracking-widest text-ice-blue">{roomId}</p>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Panel className="p-6">
            <div className="flex items-center justify-between mb-6">
              <GameHeading>Game Setup</GameHeading>
              {!isHost && (
                <p className="text-game-text-muted text-sm italic">
                  Waiting for host to configure…
                </p>
              )}
            </div>

            {/* Two-column grid on desktop */}
            <div className="md:grid md:grid-cols-2 md:gap-8 md:items-start space-y-6 md:space-y-0">
              {/* ── LEFT COLUMN: Game format ── */}
              <div className="space-y-5">
                {/* Game Mode */}
                <div className="space-y-3">
                  <p className="text-sm font-bold uppercase tracking-widest text-black">
                    Game Mode
                  </p>
                  <div className="space-y-2">
                    {GAME_MODES.map(({ mode, label, desc }) => (
                      <button
                        key={mode}
                        disabled={!isHost}
                        onClick={() => setConfig((c) => ({ ...c, gameMode: mode }))}
                        className={`
                          w-full flex items-center gap-3 px-4 py-3 border-2 border-black
                          text-left transition-all shadow-[2px_2px_0_#000]
                          ${
                            config.gameMode === mode
                              ? 'bg-magenta text-white shadow-[4px_4px_0_#000] translate-x-[-2px] translate-y-[-2px]'
                              : 'bg-white text-black hover:bg-magenta/10'
                          }
                          disabled:cursor-not-allowed
                        `}
                      >
                        <div className="flex-1">
                          <div className="font-bold text-sm">{label}</div>
                          <div
                            className={`text-xs mt-0.5 ${config.gameMode === mode ? 'text-white/80' : 'text-black/60'}`}
                          >
                            {desc}
                          </div>
                        </div>
                        <div
                          className={`w-5 h-5 border-2 flex items-center justify-center rounded-full ${config.gameMode === mode ? 'bg-white border-white' : 'border-black bg-white'}`}
                        >
                          {config.gameMode === mode && (
                            <div className="w-2.5 h-2.5 rounded-full bg-magenta" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <GameDivider />

                {/* Host device */}
                <div className="space-y-3">
                  <p className="text-sm font-bold uppercase tracking-widest text-black">
                    This Device
                  </p>
                  <button
                    disabled={!isHost}
                    onClick={() => setConfig((c) => ({ ...c, hostPlays: !c.hostPlays }))}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 border-2 border-black
                      text-left transition-all shadow-[2px_2px_0_#000]
                      ${
                        config.hostPlays
                          ? 'bg-cyan text-black shadow-[4px_4px_0_#000] translate-x-[-2px] translate-y-[-2px]'
                          : 'bg-white text-black hover:bg-cyan/20'
                      }
                      disabled:cursor-not-allowed
                    `}
                  >
                    <span className="text-xl">🎮</span>
                    <div className="flex-1">
                      <div className="font-bold text-sm text-black">
                        {config.hostPlays ? 'This Device Plays' : 'Spectator / TV Mode'}
                      </div>
                      <div className="text-xs text-black/70 font-bold">
                        {config.hostPlays
                          ? 'This device joins as a scoring player'
                          : 'Display only — assign a player as Boss to control it'}
                      </div>
                    </div>
                    <div
                      className={`w-6 h-6 border-2 border-black flex items-center justify-center shadow-[1px_1px_0_#000] ${config.hostPlays ? 'bg-magenta' : 'bg-white'}`}
                    >
                      {config.hostPlays && <span className="text-white text-md font-bold">✓</span>}
                    </div>
                  </button>
                </div>
              </div>

              {/* ── RIGHT COLUMN: Game content & difficulty ── */}
              <div className="space-y-5">
                {/* Questions / Rounds */}
                <div className="space-y-3">
                  <p className="text-sm font-bold uppercase tracking-widest text-black">
                    {isCareer ? 'Players (rounds)' : 'Questions'}
                  </p>
                  <div className="flex gap-2">
                    {[5, 10, 15, 20].map((n) => (
                      <button
                        key={n}
                        disabled={!isHost}
                        onClick={() => setConfig((c) => ({ ...c, questionCount: n }))}
                        className={`
                          flex-1 py-2.5 border-2 border-black font-bold text-sm transition-all shadow-[2px_2px_0_#000]
                          ${
                            config.questionCount === n
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

                {/* Classic-specific: Reveal mode & Answer mode */}
                {isClassic && (
                  <>
                    <GameDivider />
                    <div className="space-y-3">
                      <p className="text-sm font-bold uppercase tracking-widest text-black">
                        Stats Reveal
                      </p>
                      <div className="flex gap-2">
                        {(
                          [
                            {
                              value: 'instant',
                              label: '⚡ All at Once',
                              desc: 'See all stats immediately',
                            },
                            {
                              value: 'timed',
                              label: '⏱ Timed Reveal',
                              desc: 'Columns reveal every 8s',
                            },
                          ] as {
                            value: RevealMode
                            label: string
                            desc: string
                          }[]
                        ).map(({ value, label, desc }) => (
                          <button
                            key={value}
                            disabled={!isHost}
                            onClick={() => setConfig((c) => ({ ...c, revealMode: value }))}
                            className={`
                              flex-1 py-3 border-2 border-black text-sm transition-all text-left px-3 shadow-[2px_2px_0_#000]
                              ${
                                config.revealMode === value
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

                    <div className="space-y-3">
                      <p className="text-sm font-bold uppercase tracking-widest text-black">
                        Answer Mode
                      </p>
                      <div className="flex gap-2">
                        {(
                          [
                            {
                              value: 'multiplechoice',
                              label: '🔘 Multiple Choice',
                            },
                            { value: 'freetext', label: '✏️ Free Text' },
                          ] as { value: AnswerMode; label: string }[]
                        ).map(({ value, label }) => (
                          <button
                            key={value}
                            disabled={!isHost}
                            onClick={() => setConfig((c) => ({ ...c, answerMode: value }))}
                            className={`
                              flex-1 py-2.5 border-2 border-black font-bold text-sm transition-all shadow-[2px_2px_0_#000]
                              ${
                                config.answerMode === value
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
                  </>
                )}

                {/* Career-specific options */}
                {isCareer && (
                  <>
                    <GameDivider />
                    <div className="space-y-3">
                      <p className="text-sm font-bold uppercase tracking-widest text-black">
                        Reveal Order
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {CAREER_REVEAL_ORDERS.map(({ value, label }) => (
                          <button
                            key={value}
                            disabled={!isHost}
                            onClick={() =>
                              setConfig((c) => ({
                                ...c,
                                careerRevealOrder: value,
                              }))
                            }
                            className={`
                              py-2.5 border-2 border-black font-bold text-sm transition-all shadow-[2px_2px_0_#000]
                              ${
                                config.careerRevealOrder === value
                                  ? 'bg-cyan text-black shadow-[4px_4px_0_#000] translate-x-[-2px] translate-y-[-2px]'
                                  : 'bg-white text-black hover:bg-cyan/40'
                              }
                              disabled:cursor-not-allowed
                            `}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-black">
                          Min Seasons
                        </p>
                        <div className="flex gap-1">
                          {[3, 5, 7, 10].map((n) => (
                            <button
                              key={n}
                              disabled={!isHost}
                              onClick={() =>
                                setConfig((c) => ({
                                  ...c,
                                  careerMinSeasons: n,
                                }))
                              }
                              className={`
                                flex-1 py-2 border-2 border-black font-bold text-xs transition-all shadow-[1px_1px_0_#000]
                                ${
                                  config.careerMinSeasons === n
                                    ? 'bg-lime text-black shadow-[2px_2px_0_#000] -translate-x-px -translate-y-px'
                                    : 'bg-white text-black hover:bg-lime/30'
                                }
                                disabled:cursor-not-allowed
                              `}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-black">
                          Max Reveals
                        </p>
                        <div className="flex gap-1">
                          {[5, 6, 8, 10].map((n) => (
                            <button
                              key={n}
                              disabled={!isHost}
                              onClick={() =>
                                setConfig((c) => ({
                                  ...c,
                                  careerMaxReveals: n,
                                }))
                              }
                              className={`
                                flex-1 py-2 border-2 border-black font-bold text-xs transition-all shadow-[1px_1px_0_#000]
                                ${
                                  config.careerMaxReveals === n
                                    ? 'bg-lime text-black shadow-[2px_2px_0_#000] -translate-x-px -translate-y-px'
                                    : 'bg-white text-black hover:bg-lime/30'
                                }
                                disabled:cursor-not-allowed
                              `}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Higher/Lower: stat field */}
                {isHL && (
                  <>
                    <GameDivider />
                    <div className="space-y-3">
                      <p className="text-sm font-bold uppercase tracking-widest text-black">
                        Compare Stat
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {HL_FIELDS.map(({ value, label }) => (
                          <button
                            key={value}
                            disabled={!isHost}
                            onClick={() =>
                              setConfig((c) => ({
                                ...c,
                                hlComparisonField: value,
                              }))
                            }
                            className={`
                              py-2 border-2 border-black font-bold text-xs transition-all shadow-[2px_2px_0_#000]
                              ${
                                config.hlComparisonField === value
                                  ? 'bg-yellow text-black shadow-[4px_4px_0_#000] translate-x-[-2px] translate-y-[-2px]'
                                  : 'bg-white text-black hover:bg-yellow/40'
                              }
                              disabled:cursor-not-allowed
                            `}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Difficulty tiers */}
                {needsTiers && (
                  <>
                    <GameDivider />
                    <div className="space-y-3">
                      <p className="text-sm font-bold uppercase tracking-widest text-black">
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
                                ${
                                  selected
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
                                className={`w-6 h-6 border-2 border-black flex items-center justify-center shadow-[1px_1px_0_#000] ${selected ? 'bg-magenta' : 'bg-white'}`}
                              >
                                {selected && (
                                  <span className="text-white text-md font-bold">✓</span>
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                      {config.difficultyTiers.length === 0 && (
                        <p className="text-game-red text-xs">Select at least one difficulty tier</p>
                      )}
                    </div>
                  </>
                )}

                {/* Eras */}
                <GameDivider />
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <p className="text-sm font-bold uppercase tracking-widest text-black">Eras</p>
                    {availableCount !== null && (
                      <p className="text-xs font-bold font-mono bg-yellow border-2 border-black px-2 shadow-[2px_2px_0_#000]">
                        Pool: {availableCount} {isCareer ? 'players' : 'seasons'}
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
                            ${
                              selected
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

                {/* Classic extras: Hints, Powerups, Rookies */}
                {isClassic && (
                  <>
                    <GameDivider />
                    <div className="flex gap-4">
                      {(
                        [
                          {
                            key: 'hintsEnabled',
                            label: '💡 Hints',
                            desc: '-10 pts each',
                          },
                          {
                            key: 'powerupsEnabled',
                            label: '⚡ Powerups',
                            desc: '1 charge each',
                          },
                        ] as {
                          key: keyof GameSetupConfig
                          label: string
                          desc: string
                        }[]
                      ).map(({ key, label, desc }) => (
                        <button
                          key={key}
                          disabled={!isHost}
                          onClick={() => setConfig((c) => ({ ...c, [key]: !c[key] }))}
                          className={`
                            flex-1 flex flex-col items-center gap-1 py-3 px-2 border-2 border-black shadow-[2px_2px_0_#000]
                            transition-all text-sm
                            ${
                              config[key]
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

                    <button
                      disabled={!isHost}
                      onClick={() =>
                        setConfig((c) => ({
                          ...c,
                          rookiesOnly: !c.rookiesOnly,
                        }))
                      }
                      className={`
                        w-full flex items-center gap-3 px-4 py-3 border-2 border-black
                        text-left transition-all shadow-[2px_2px_0_#000]
                        ${
                          config.rookiesOnly
                            ? 'bg-lime text-black shadow-[4px_4px_0_#000] translate-x-[-2px] translate-y-[-2px]'
                            : 'bg-white text-black hover:bg-lime/20'
                        }
                        disabled:cursor-not-allowed
                      `}
                    >
                      <span className="text-xl">🌱</span>
                      <div className="flex-1">
                        <div className="font-bold text-sm text-black">Rookies Only</div>
                        <div className="text-xs text-black/80 font-bold">
                          Only show debut seasons
                        </div>
                      </div>
                      <div
                        className={`w-6 h-6 border-2 border-black flex items-center justify-center shadow-[1px_1px_0_#000] ${config.rookiesOnly ? 'bg-magenta' : 'bg-white'}`}
                      >
                        {config.rookiesOnly && (
                          <span className="text-white text-md font-bold">✓</span>
                        )}
                      </div>
                    </button>
                  </>
                )}

                {/* CTA */}
                {isHost && (
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full mt-2"
                    onClick={handleStart}
                    disabled={!canStart || starting}
                  >
                    {starting
                      ? 'Starting…'
                      : !canStart &&
                          availableCount !== null &&
                          availableCount < config.questionCount
                        ? 'Not enough players'
                        : '🏒 Continue to Lobby'}
                  </Button>
                )}
              </div>
              {/* end right column */}
            </div>
            {/* end two-column grid */}
          </Panel>
        </motion.div>

        <AdsterraBanner slot="setup" />
      </div>
    </main>
  )
}
