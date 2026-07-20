'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useStorage } from '@/lib/liveblocks/client'
import { useSaveSettings } from '@/lib/liveblocks/mutations'
import { checkAvailableCount, checkCareerPlayerCount } from '@/app/actions/game-actions'
import { getOrCreateGuest } from '@/lib/guest'
import { Button } from '@/components/design-system'
import { CBrand } from '@/components/arcade'
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

type AccentColor = 'green' | 'navy' | 'red' | 'yellow'

const ACCENT_BG: Record<AccentColor, string> = {
  green: 'bg-c-green',
  navy: 'bg-c-navy',
  red: 'bg-c-red',
  yellow: 'bg-c-yellow',
}

const ACCENT_FG: Record<AccentColor, string> = {
  green: 'text-white',
  navy: 'text-white',
  red: 'text-white',
  yellow: 'text-c-ink',
}

const ACCENT_META: Record<AccentColor, string> = {
  green: 'text-white/85',
  navy: 'text-white/85',
  red: 'text-white/85',
  yellow: 'text-c-ink/75',
}

const TIER_OPTIONS: {
  tier: DifficultyTier
  label: string
  range: string
  desc: string
  emoji: string
  accent: AccentColor
}[] = [
  { tier: 'easy', label: 'Easy', range: '140+', desc: 'Legends', emoji: '🥇', accent: 'green' },
  {
    tier: 'medium',
    label: 'Medium',
    range: '120–139',
    desc: 'Greats',
    emoji: '⭐',
    accent: 'navy',
  },
  { tier: 'hard', label: 'Hard', range: '100–119', desc: '', emoji: '🔥', accent: 'red' },
  { tier: 'expert', label: 'Expert', range: '70–99', desc: '', emoji: '💀', accent: 'yellow' },
]

const GAME_MODES: {
  mode: GameMode
  label: string
  desc: string
  emoji: string
  accent: AccentColor
}[] = [
  {
    mode: 'classic',
    label: 'Classic',
    desc: 'Guess the player from a single season',
    emoji: '🏒',
    accent: 'red',
  },
  {
    mode: 'career',
    label: 'Career',
    desc: 'Seasons revealed one by one — buzz in!',
    emoji: '📈',
    accent: 'navy',
  },
  {
    mode: 'h2h',
    label: 'Head-to-Head',
    desc: 'Which stat line belongs to this player?',
    emoji: '🤼',
    accent: 'yellow',
  },
  {
    mode: 'higher-lower',
    label: 'Higher / Lower',
    desc: 'Did they score more or less?',
    emoji: '⚖️',
    accent: 'green',
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

// ─── Small section label (muted Archivo) ──────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="m-0 font-display-alt text-[10px] font-black tracking-[0.22em] text-c-muted uppercase">
      {children}
    </p>
  )
}

// ─── Pill toggle switch (44×24) ────────────────────────────────────────────────

function Toggle({
  on,
  onClick,
  disabled,
}: {
  on: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      aria-pressed={on}
      className={`relative h-6 w-11 shrink-0 rounded-full border-2 border-c-ink p-0 transition-colors ${
        on ? 'bg-c-green' : 'bg-c-disabled-fill'
      } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
    >
      <span
        className={`absolute top-px size-[18px] rounded-full border-2 border-c-ink bg-white transition-[left] ${
          on ? 'left-[21px]' : 'left-px'
        }`}
      />
    </button>
  )
}

// ─── Segmented chip ────────────────────────────────────────────────────────────

function SegBtn({
  on,
  onClick,
  disabled,
  children,
  small,
}: {
  on: boolean
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
  small?: boolean
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`rounded-[9px] border-2 border-c-ink font-display leading-none transition-all ${
        small ? 'px-2.5 py-1.5 text-[11px]' : 'px-3.5 py-2 text-[13px]'
      } ${
        on
          ? 'bg-c-navy text-white shadow-[0_3px_0_#0a1535]'
          : 'bg-white text-c-ink shadow-[0_2px_0_rgba(10,21,53,0.25)]'
      } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
    >
      {children}
    </button>
  )
}

// ─── Format row (label left, control right) ────────────────────────────────────

function FormatRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-body text-[13px] font-bold text-c-ink">{label}</span>
      <div className="flex flex-wrap items-center justify-end gap-1.5">{children}</div>
    </div>
  )
}

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

  // Config summary line for the start bar
  const modeLabel = GAME_MODES.find((m) => m.mode === config.gameMode)?.label.toUpperCase() ?? ''
  const tiersLabel =
    config.difficultyTiers.length > 0
      ? config.difficultyTiers.map((t) => t.toUpperCase()).join(' + ')
      : '—'
  const configSummary = `${modeLabel} · ${tiersLabel} · ${config.eras.length} ERA${config.eras.length === 1 ? '' : 'S'} · ${config.questionCount} Q`

  return (
    <main className="ice-bg min-h-screen p-4 sm:p-5 md:p-[22px]">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-4">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CBrand small />
          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              ◁ BACK
            </Button>
            <div className="inline-flex items-center rounded-full border-2 border-c-ink bg-white px-3.5 py-1.5 shadow-[0_2px_0_rgba(10,21,53,0.25)]">
              <span className="font-mono text-xs font-bold tracking-[0.18em] text-c-ink">
                ROOM · {roomId}
              </span>
            </div>
          </div>
        </div>

        {/* ── Title row ── */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-3.5">
          <span className="inline-block rounded-full border-2 border-c-ink bg-c-yellow px-3 py-1 font-display-alt text-[10px] font-black tracking-[0.22em] text-c-ink shadow-[0_2px_0_rgba(10,21,53,0.25)]">
            STEP 1 OF 2
          </span>
          <h2 className="m-0 font-display text-2xl leading-none text-c-ink sm:text-[26px] md:text-[30px]">
            SET UP YOUR GAME
          </h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4"
        >
          {/* ── Game-mode grid ── */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {GAME_MODES.map((m) => {
              const on = config.gameMode === m.mode
              return (
                <button
                  key={m.mode}
                  disabled={!isHost}
                  onClick={() => setConfig((c) => ({ ...c, gameMode: m.mode }))}
                  className={`flex flex-col gap-1.5 rounded-[14px] border-2 border-c-ink p-4 text-left transition-all ${
                    on
                      ? `${ACCENT_BG[m.accent]} ${ACCENT_FG[m.accent]} shadow-[0_5px_0_#0a1535]`
                      : 'bg-white text-c-ink shadow-[0_2px_0_rgba(10,21,53,0.25)]'
                  } ${isHost ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                >
                  <span className="text-xl leading-none">{m.emoji}</span>
                  <div className="font-display text-[15px] leading-none">{m.label}</div>
                  <div
                    className={`font-body text-xs leading-snug ${on ? 'opacity-90' : 'opacity-70'}`}
                  >
                    {m.desc}
                  </div>
                </button>
              )
            })}
          </div>

          {/* ── Two-column area ── */}
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            {/* ── LEFT: Difficulty + Eras ── */}
            <div className="card-puffy flex flex-col gap-4 bg-white p-4 sm:gap-[18px] sm:p-5">
              {/* Difficulty */}
              <div className="flex flex-col gap-3">
                <SectionLabel>Difficulty · Pick Any</SectionLabel>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                  {TIER_OPTIONS.map(({ tier, label, range, desc, emoji, accent }) => {
                    const on = config.difficultyTiers.includes(tier)
                    const line = desc ? `${range} · ${desc.toUpperCase()}` : range
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
                        className={`flex flex-col items-start gap-1.5 rounded-xl border-2 border-c-ink px-2 py-2.5 text-left transition-all sm:px-[9px] ${
                          on
                            ? `${ACCENT_BG[accent]} ${ACCENT_FG[accent]} shadow-px_0_#0a1535]`
                            : 'bg-white text-c-ink shadow-[0_2px_0_rgba(10,21,53,0.25)]'
                        } ${isHost ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="text-sm">{emoji}</span>
                          <span className="font-display text-xs leading-none">{label}</span>
                        </span>
                        <span
                          className={`font-mono text-[9px] font-bold tracking-[0.08em] ${
                            on ? ACCENT_META[accent] : 'text-c-muted'
                          }`}
                        >
                          {line}
                        </span>
                      </button>
                    )
                  })}
                </div>
                {config.difficultyTiers.length === 0 && (
                  <p className="m-0 font-body text-xs text-c-red">
                    Select at least one difficulty tier
                  </p>
                )}
              </div>

              {/* Eras */}
              <div className="flex flex-col gap-2.5">
                <SectionLabel>Eras</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {['1970s', '1980s', '1990s', '2000s', '2010s', '2020s'].map((era) => {
                    const on = config.eras.includes(era)
                    return (
                      <button
                        key={era}
                        disabled={!isHost}
                        onClick={() => setConfig((c) => ({ ...c, eras: toggle(c.eras, era) }))}
                        className={`rounded-full border-2 px-3 py-1.5 font-mono text-xs font-bold tracking-[0.08em] transition-all ${
                          on
                            ? 'border-c-ink bg-c-navy text-white shadow-[0_2px_0_#0a1535]'
                            : 'border-c-disabled-border bg-c-disabled-fill text-c-muted'
                        } ${isHost ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                      >
                        {era}
                        {on ? ' ✓' : ''}
                      </button>
                    )
                  })}
                </div>
                {config.eras.length === 0 && (
                  <p className="m-0 font-body text-xs text-c-red">Select at least one era</p>
                )}
              </div>
            </div>

            {/* ── RIGHT: Format ── */}
            <div className="card-puffy flex flex-col gap-4 bg-white p-4 sm:p-5">
              <SectionLabel>Format</SectionLabel>

              {/* Questions */}
              <FormatRow label={isCareer ? 'Players (rounds)' : 'Questions'}>
                {[5, 10, 15, 20].map((n) => (
                  <SegBtn
                    key={n}
                    on={config.questionCount === n}
                    onClick={() => setConfig((c) => ({ ...c, questionCount: n }))}
                    disabled={!isHost}
                  >
                    {n}
                  </SegBtn>
                ))}
              </FormatRow>

              {/* Answers */}
              <FormatRow label="Answers">
                {(
                  [
                    { value: 'multiplechoice', label: 'MULTIPLE CHOICE' },
                    { value: 'freetext', label: 'TYPE IT' },
                  ] as { value: AnswerMode; label: string }[]
                ).map(({ value, label }) => (
                  <SegBtn
                    key={value}
                    on={config.answerMode === value}
                    onClick={() => setConfig((c) => ({ ...c, answerMode: value }))}
                    disabled={!isHost}
                    small
                  >
                    {label}
                  </SegBtn>
                ))}
              </FormatRow>

              {/* Classic-only extras */}
              {isClassic && (
                <>
                  <FormatRow label="Stats reveal">
                    {(
                      [
                        { value: 'instant', label: 'ALL AT ONCE' },
                        { value: 'timed', label: 'TIMED' },
                      ] as { value: RevealMode; label: string }[]
                    ).map(({ value, label }) => (
                      <SegBtn
                        key={value}
                        on={config.revealMode === value}
                        onClick={() => setConfig((c) => ({ ...c, revealMode: value }))}
                        disabled={!isHost}
                        small
                      >
                        {label}
                      </SegBtn>
                    ))}
                  </FormatRow>

                  {/* <FormatRow label="Rookies only">
                    <Toggle
                      on={config.rookiesOnly}
                      onClick={() => setConfig((c) => ({ ...c, rookiesOnly: !c.rookiesOnly }))}
                      disabled={!isHost}
                    />
                  </FormatRow> */}

                  <FormatRow label="Hints">
                    <Toggle
                      on={config.hintsEnabled}
                      onClick={() => setConfig((c) => ({ ...c, hintsEnabled: !c.hintsEnabled }))}
                      disabled={!isHost}
                    />
                  </FormatRow>
                </>
              )}

              {/* Power plays (powerups) */}
              <FormatRow label="Power plays">
                <Toggle
                  on={config.powerupsEnabled}
                  onClick={() => setConfig((c) => ({ ...c, powerupsEnabled: !c.powerupsEnabled }))}
                  disabled={!isHost}
                />
              </FormatRow>

              {/* This device */}
              <FormatRow label="This device plays">
                <Toggle
                  on={config.hostPlays}
                  onClick={() => setConfig((c) => ({ ...c, hostPlays: !c.hostPlays }))}
                  disabled={!isHost}
                />
              </FormatRow>

              {/* HL: compare stat */}
              {isHL && (
                <FormatRow label="Compare stat">
                  {HL_FIELDS.map(({ value, label }) => (
                    <SegBtn
                      key={value}
                      on={config.hlComparisonField === value}
                      onClick={() => setConfig((c) => ({ ...c, hlComparisonField: value }))}
                      disabled={!isHost}
                      small
                    >
                      {label}
                    </SegBtn>
                  ))}
                </FormatRow>
              )}

              {/* Career-specific options */}
              {isCareer && (
                <>
                  <FormatRow label="Reveal order">
                    {CAREER_REVEAL_ORDERS.map(({ value, label }) => (
                      <SegBtn
                        key={value}
                        on={config.careerRevealOrder === value}
                        onClick={() => setConfig((c) => ({ ...c, careerRevealOrder: value }))}
                        disabled={!isHost}
                        small
                      >
                        {label}
                      </SegBtn>
                    ))}
                  </FormatRow>

                  <FormatRow label="Min seasons">
                    {[3, 5, 7, 10].map((n) => (
                      <SegBtn
                        key={n}
                        on={config.careerMinSeasons === n}
                        onClick={() => setConfig((c) => ({ ...c, careerMinSeasons: n }))}
                        disabled={!isHost}
                        small
                      >
                        {n}
                      </SegBtn>
                    ))}
                  </FormatRow>

                  <FormatRow label="Max reveals">
                    {[5, 6, 8, 10].map((n) => (
                      <SegBtn
                        key={n}
                        on={config.careerMaxReveals === n}
                        onClick={() => setConfig((c) => ({ ...c, careerMaxReveals: n }))}
                        disabled={!isHost}
                        small
                      >
                        {n}
                      </SegBtn>
                    ))}
                  </FormatRow>
                </>
              )}
            </div>
          </div>

          {/* ── Start bar ── */}
          <div className="fixed bottom-4 left-4 right-4 flex flex-wrap items-center gap-3 rounded-[14px] bg-c-ink px-4 py-3.5 shadow-[0_2px_0_rgba(10,21,53,0.25)] sm:gap-4 sm:px-[18px] sm:py-3.5">
            {availableCount !== null && (
              <span className="rounded-full border-2 border-c-ink bg-c-green px-3 py-1.5 font-display-alt text-[10px] font-black tracking-[0.14em] text-c-ink uppercase">
                ✓ {availableCount} PLAYERS IN POOL
              </span>
            )}
            <span className="font-mono text-xs font-bold tracking-[0.12em] text-[#9fb3d9]">
              {configSummary}
            </span>
            <div className="w-full sm:ml-auto sm:w-auto">
              {isHost ? (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleStart}
                  disabled={!canStart || starting}
                  className="w-full border-2 border-white sm:w-auto"
                >
                  {starting
                    ? 'STARTING…'
                    : !canStart && availableCount !== null && availableCount < config.questionCount
                      ? 'NOT ENOUGH PLAYERS'
                      : 'CONTINUE TO LOBBY →'}
                </Button>
              ) : (
                <span className="block text-center font-mono text-xs font-bold tracking-[0.16em] text-[#9fb3d9] sm:text-left">
                  WAITING FOR HOST…
                </span>
              )}
            </div>
          </div>
        </motion.div>

        <AdsterraBanner slot="setup" />
      </div>
    </main>
  )
}
