'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { useStorage } from '@/lib/liveblocks/client'
import { useSaveSettings } from '@/lib/liveblocks/mutations'
import { checkAvailableCount, checkCareerPlayerCount } from '@/app/actions/game-actions'
import { getOrCreateGuest } from '@/lib/guest'
import { Button, Kickplate, MonoLabel } from '@/components/design-system'
import { PuckMark } from '@/components/arcade'
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

const INK = '#0d1b2a'
const RED = '#cf0a2c'
const BLUE = '#0b53c9'
const DEAD = '#b3c0cf'

// ─── Options ──────────────────────────────────────────────────────────────────

const TIER_OPTIONS: {
  tier: DifficultyTier
  label: string
  range: string
  desc: string
}[] = [
  { tier: 'easy', label: 'Easy', range: '140+ PTS', desc: 'Legends' },
  { tier: 'medium', label: 'Medium', range: '120–139', desc: 'All-time greats' },
  { tier: 'hard', label: 'Hard', range: '100–119', desc: 'Excellent scorers' },
  { tier: 'expert', label: 'Expert', range: '70–99', desc: 'Solid contributors' },
]

const GAME_MODES: { mode: GameMode; label: string; tag: string; desc: string; edge: string }[] = [
  {
    mode: 'classic',
    label: 'Classic',
    tag: 'Most played',
    desc: 'One season stat line. Four names, or type it blind.',
    edge: RED,
  },
  {
    mode: 'career',
    label: 'Career',
    tag: 'Buzz in',
    desc: 'Seasons reveal one by one. First to buzz gets the shot.',
    edge: BLUE,
  },
  {
    mode: 'h2h',
    label: 'Head-to-Head',
    tag: 'Two lines',
    desc: 'Two stat lines, one name. Which column is his?',
    edge: INK,
  },
  {
    mode: 'higher-lower',
    label: 'Higher / Lower',
    tag: 'Fast',
    desc: 'Above or below the reference line?',
    edge: '#f2b21c',
  },
]

const HL_FIELDS: { value: HLComparisonField; label: string }[] = [
  { value: 'points', label: 'Points' },
  { value: 'goals', label: 'Goals' },
  { value: 'assists', label: 'Assists' },
  { value: 'penaltyMinutes', label: 'PIM' },
  { value: 'gamesPlayed', label: 'GP' },
]

const CAREER_REVEAL_ORDERS: { value: CareerRevealOrder; label: string }[] = [
  { value: 'best-first', label: 'Best first' },
  { value: 'worst-first', label: 'Worst first' },
  { value: 'chronological', label: 'Chronological' },
  { value: 'random', label: 'Random' },
]

const ERAS = ['1970s', '1980s', '1990s', '2000s', '2010s', '2020s']

// ─── Primitives ───────────────────────────────────────────────────────────────

/** A group of settings on one white plane, opened by a mono label. */
function Group({
  label,
  children,
  className = '',
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`on-ice flex flex-col gap-4 p-5 ${className}`}>
      <MonoLabel size={10} tracking="0.22em">{label}</MonoLabel>
      {children}
    </div>
  )
}

/** Square segmented chip. Selection is carried by fill AND weight, not hue alone. */
function SegBtn({
  on,
  onClick,
  disabled,
  children,
}: {
  on: boolean
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={on}
      className="btn-ice font-display"
      style={{
        border: 'none',
        borderRadius: 0,
        padding: '9px 13px',
        fontWeight: 700,
        fontSize: 14,
        lineHeight: 1,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        background: on ? INK : '#ffffff',
        color: on ? '#eef3f9' : '#55677d',
        boxShadow: on ? 'none' : 'inset 0 0 0 1px rgba(13,27,42,0.14)',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  )
}

/** Square toggle. Reads ON / OFF in words so the state is never colour-only. */
function Toggle({
  label,
  on,
  onClick,
  disabled,
}: {
  /** The visible row label, repeated for assistive tech. */
  label: string
  on: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={on}
      aria-label={label}
      className="btn-ice flex items-center gap-2"
      style={{
        border: 'none',
        borderRadius: 0,
        padding: 0,
        background: 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span className="font-mono" style={{ fontSize: 9, letterSpacing: '0.16em', color: on ? RED : '#55677d' }}>
        {on ? 'ON' : 'OFF'}
      </span>
      <span
        className="relative block"
        style={{ width: 40, height: 20, background: on ? RED : '#f4f7fa', boxShadow: on ? 'none' : 'inset 0 0 0 1px rgba(13,27,42,0.14)' }}
      >
        <span
          className="absolute top-[3px] block transition-[left]"
          style={{ width: 14, height: 14, left: on ? 23 : 3, background: on ? '#ffffff' : INK }}
        />
      </span>
    </button>
  )
}

/** Label left, control right, closed by a hairline. */
function FormatRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 pb-3.5"
      style={{ borderBottom: '1px solid rgba(13,27,42,0.07)' }}
    >
      <span
        className="font-display"
        style={{ fontWeight: 700, fontSize: 19, lineHeight: 1, textTransform: 'uppercase' }}
      >
        {label}
      </span>
      <div className="flex flex-wrap items-center justify-end gap-1.5">{children}</div>
    </div>
  )
}

/** A selectable plane with a left edge marker and an explicit check when on. */
function OptionPlane({
  on,
  disabled,
  edge,
  onClick,
  title,
  meta,
  desc,
  titleSize = 26,
}: {
  on: boolean
  disabled?: boolean
  edge: string
  onClick: () => void
  title: string
  meta?: string
  desc?: string
  titleSize?: number
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={on}
      className="btn-ice flex flex-col gap-2 p-4 text-left"
      style={{
        border: 'none',
        borderLeft: `6px solid ${on ? edge : DEAD}`,
        borderRadius: 0,
        background: on ? 'rgba(207,10,44,0.05)' : '#ffffff',
        boxShadow: on ? '0 2px 10px rgba(13,27,42,0.10)' : '0 2px 10px rgba(13,27,42,0.05)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <div className="flex w-full items-baseline gap-2">
        <span
          className="font-display flex-1"
          style={{
            fontWeight: 800,
            fontSize: titleSize,
            lineHeight: 1,
            textTransform: 'uppercase',
            color: INK,
          }}
        >
          {title}
        </span>
        {on && <Check size={15} strokeWidth={2.4} color={RED} />}
      </div>
      {meta && <MonoLabel size={9} tracking="0.16em">{meta}</MonoLabel>}
      {desc && (
        <span style={{ fontSize: 12.5, lineHeight: 1.55, color: '#55677d' }}>{desc}</span>
      )}
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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

  // Live pool count - mode-aware
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

  const modeLabel = GAME_MODES.find((m) => m.mode === config.gameMode)?.label.toUpperCase() ?? ''
  const tiersLabel =
    config.difficultyTiers.length > 0
      ? config.difficultyTiers.map((t) => t.toUpperCase()).join(' + ')
      : '—'
  const configSummary = `${modeLabel} · ${tiersLabel} · ${config.eras.length} ERA${config.eras.length === 1 ? '' : 'S'} · ${config.questionCount} Q`

  const startLabel = starting
    ? 'Starting…'
    : !canStart && availableCount !== null && availableCount < config.questionCount
      ? 'Not enough players'
      : 'Continue to lobby'

  return (
    <main className="ice-bg relative flex min-h-screen flex-col overflow-x-hidden">
      {/* ── Header ── */}
      <header className="on-ice-header relative z-20">
        <div className="flex h-[60px] items-center justify-between px-5 md:px-8">
          <div className="flex items-center gap-[11px]">
            <PuckMark size={26} />
            <span
              className="font-display"
              style={{ fontWeight: 800, fontSize: 18, letterSpacing: '0.02em' }}
            >
              STATS MASTER
            </span>
          </div>
          <div className="flex items-center gap-4">
            <MonoLabel size={9} tracking="0.22em">Room {roomId}</MonoLabel>
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft size={14} strokeWidth={2.2} />
              Back
            </Button>
          </div>
        </div>
        <Kickplate />
      </header>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative z-[2] mx-auto flex w-full max-w-[1100px] flex-col gap-5 px-5 pt-8 pb-[132px] md:px-8"
      >
        {/* ── Title ── */}
        <div className="flex flex-col gap-2">
          <MonoLabel size={10} tracking="0.3em">Step 1 of 2</MonoLabel>
          <h1
            className="font-display m-0"
            style={{
              fontWeight: 800,
              fontSize: 'clamp(38px,7vw,60px)',
              lineHeight: 0.9,
              letterSpacing: '0.005em',
              textTransform: 'uppercase',
            }}
          >
            Set up your game
          </h1>
        </div>

        {/* ── Mode ── */}
        <div className="flex flex-col gap-3">
          <MonoLabel size={10} tracking="0.22em">Mode · pick one</MonoLabel>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {GAME_MODES.map((m) => (
              <OptionPlane
                key={m.mode}
                on={config.gameMode === m.mode}
                disabled={!isHost}
                edge={m.edge}
                onClick={() => setConfig((c) => ({ ...c, gameMode: m.mode }))}
                title={m.label}
                meta={m.tag}
                desc={m.desc}
                titleSize={24}
              />
            ))}
          </div>
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          {/* ── Difficulty + eras ── */}
          <div className="flex flex-col gap-4">
            <Group label="Difficulty · pick any">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {TIER_OPTIONS.map(({ tier, label, range, desc }) => (
                  <OptionPlane
                    key={tier}
                    on={config.difficultyTiers.includes(tier)}
                    disabled={!isHost}
                    edge={INK}
                    onClick={() =>
                      setConfig((c) => ({
                        ...c,
                        difficultyTiers: toggle(c.difficultyTiers, tier),
                      }))
                    }
                    title={label}
                    meta={range}
                    desc={desc}
                    titleSize={21}
                  />
                ))}
              </div>
              {config.difficultyTiers.length === 0 && (
                <p className="m-0" style={{ fontSize: 12.5, color: RED }}>
                  Select at least one difficulty tier.
                </p>
              )}
            </Group>

            <Group label="Eras">
              <div className="flex flex-wrap gap-1.5">
                {ERAS.map((era) => (
                  <SegBtn
                    key={era}
                    on={config.eras.includes(era)}
                    disabled={!isHost}
                    onClick={() => setConfig((c) => ({ ...c, eras: toggle(c.eras, era) }))}
                  >
                    {era}
                  </SegBtn>
                ))}
              </div>
              {config.eras.length === 0 && (
                <p className="m-0" style={{ fontSize: 12.5, color: RED }}>
                  Select at least one era.
                </p>
              )}
            </Group>
          </div>

          {/* ── Format ── */}
          <Group label="Format">
            <div className="flex flex-col gap-3.5">
              <FormatRow label={isCareer ? 'Rounds' : 'Questions'}>
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

              <FormatRow label="Answers">
                {(
                  [
                    { value: 'multiplechoice', label: 'Multiple choice' },
                    { value: 'freetext', label: 'Type it' },
                  ] as { value: AnswerMode; label: string }[]
                ).map(({ value, label }) => (
                  <SegBtn
                    key={value}
                    on={config.answerMode === value}
                    onClick={() => setConfig((c) => ({ ...c, answerMode: value }))}
                    disabled={!isHost}
                  >
                    {label}
                  </SegBtn>
                ))}
              </FormatRow>

              {isClassic && (
                <>
                  <FormatRow label="Stats reveal">
                    {(
                      [
                        { value: 'instant', label: 'All at once' },
                        { value: 'timed', label: 'Column by column' },
                      ] as { value: RevealMode; label: string }[]
                    ).map(({ value, label }) => (
                      <SegBtn
                        key={value}
                        on={config.revealMode === value}
                        onClick={() => setConfig((c) => ({ ...c, revealMode: value }))}
                        disabled={!isHost}
                      >
                        {label}
                      </SegBtn>
                    ))}
                  </FormatRow>

                  <FormatRow label="Hints">
                    <Toggle
                      label="Hints"
                      on={config.hintsEnabled}
                      onClick={() => setConfig((c) => ({ ...c, hintsEnabled: !c.hintsEnabled }))}
                      disabled={!isHost}
                    />
                  </FormatRow>
                </>
              )}

              <FormatRow label="Power plays">
                <Toggle
                  label="Power plays"
                  on={config.powerupsEnabled}
                  onClick={() => setConfig((c) => ({ ...c, powerupsEnabled: !c.powerupsEnabled }))}
                  disabled={!isHost}
                />
              </FormatRow>

              <FormatRow label="This device plays">
                <Toggle
                  label="This device plays"
                  on={config.hostPlays}
                  onClick={() => setConfig((c) => ({ ...c, hostPlays: !c.hostPlays }))}
                  disabled={!isHost}
                />
              </FormatRow>

              {isHL && (
                <FormatRow label="Compare stat">
                  {HL_FIELDS.map(({ value, label }) => (
                    <SegBtn
                      key={value}
                      on={config.hlComparisonField === value}
                      onClick={() => setConfig((c) => ({ ...c, hlComparisonField: value }))}
                      disabled={!isHost}
                    >
                      {label}
                    </SegBtn>
                  ))}
                </FormatRow>
              )}

              {isCareer && (
                <>
                  <FormatRow label="Reveal order">
                    {CAREER_REVEAL_ORDERS.map(({ value, label }) => (
                      <SegBtn
                        key={value}
                        on={config.careerRevealOrder === value}
                        onClick={() => setConfig((c) => ({ ...c, careerRevealOrder: value }))}
                        disabled={!isHost}
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
                      >
                        {n}
                      </SegBtn>
                    ))}
                  </FormatRow>
                </>
              )}
            </div>
          </Group>
        </div>

        <AdsterraBanner slot="setup" />
      </motion.div>

      {/* ── Start bar: the boards at the foot of the screen ── */}
      <div className="fixed inset-x-0 bottom-0 z-40">
        <Kickplate height={4} />
        <div
          className="flex flex-wrap items-center gap-4 px-5 py-4 md:px-8"
          style={{ background: INK }}
        >
          {availableCount !== null && (
            <span
              className="font-mono"
              style={{
                fontSize: 9,
                letterSpacing: '0.16em',
                color: '#fff',
                background: availableCount > 0 ? RED : 'rgba(255,255,255,0.14)',
                padding: '5px 9px',
              }}
            >
              {availableCount.toLocaleString()} IN POOL
            </span>
          )}
          <span
            className="font-mono"
            style={{ fontSize: 10, letterSpacing: '0.14em', color: '#8d9cb0' }}
          >
            {configSummary}
          </span>

          <div className="w-full sm:ml-auto sm:w-auto">
            {isHost ? (
              <Button
                variant="primary"
                size="md"
                onClick={handleStart}
                disabled={!canStart || starting}
                className="w-full sm:w-auto"
              >
                {startLabel}
                <ArrowRight size={16} strokeWidth={2.2} />
              </Button>
            ) : (
              <MonoLabel size={10} tracking="0.16em" color="#8d9cb0">
                Waiting for host
              </MonoLabel>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
