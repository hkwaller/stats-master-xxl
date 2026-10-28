'use client'

import { RinkBg } from '@/components/arcade/RinkBg'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, BellRing, Check, ChevronDown, Eye, UserRoundCheck } from 'lucide-react'
import { useStorage } from '@/lib/party/client'
import { useSaveSettings } from '@/lib/party/mutations'
import { AnimatedPoolCount } from '@/components/game/AnimatedPoolCount'
import { PowerPlayHelp } from '@/components/game/PowerPlayHelp'
import { useSetupPool } from '@/hooks/useSetupPool'
import { getOrCreateGuest } from '@/lib/guest'
import { Button, Kickplate, MonoLabel } from '@/components/design-system'
import { JumbotronPanel, PuckMark } from '@/components/arcade'
import type {
  AnswerMode,
  DifficultyTier,
  GameMode,
  GameSetupConfig,
  HLComparisonField,
  RevealMode,
} from '@/types/game'
import { DEFAULT_SETUP } from '@/types/game'

const INK = 'var(--color-ink)'
const RED = 'var(--color-red)'
const DEAD = 'var(--color-edge-dead)'

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

const GAME_MODES: { mode: GameMode; label: string; desc: string }[] = [
  {
    mode: 'classic',
    label: 'Classic',
    desc: 'One season stat line. Four names, or type it blind.',
  },
  {
    mode: 'career',
    label: 'Career',
    desc: 'Seasons reveal one by one. First to buzz gets the shot.',
  },
  {
    mode: 'h2h',
    label: 'Head-to-Head',
    desc: 'Two stat lines, one name. Which column is his?',
  },
  {
    mode: 'higher-lower',
    label: 'Higher / Lower',
    desc: 'Above or below the reference line?',
  },
]

const HL_FIELDS: { value: HLComparisonField; label: string }[] = [
  { value: 'points', label: 'Points' },
  { value: 'goals', label: 'Goals' },
  { value: 'assists', label: 'Assists' },
  { value: 'penaltyMinutes', label: 'PIM' },
  { value: 'gamesPlayed', label: 'GP' },
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
    <section aria-label={label} className={`setup-group on-ice flex flex-col gap-3 p-4 ${className}`}>
      <MonoLabel size={10} tracking="0.22em">
        {label}
      </MonoLabel>
      {children}
    </section>
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
      className="setup-segment btn-ice font-display"
      style={{
        border: 'none',
        borderRadius: 0,
        padding: '12px 13px',
        minHeight: 44,
        fontWeight: 700,
        fontSize: 14,
        lineHeight: 1,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        background: on ? INK : 'var(--color-ice-0)',
        color: on ? 'var(--color-ice-1)' : 'var(--color-ink-2)',
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
      className="setup-toggle btn-ice flex min-h-11 items-center gap-2"
      style={{
        border: 'none',
        borderRadius: 0,
        padding: 0,
        background: 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        className="font-mono"
        style={{ fontSize: 9, letterSpacing: '0.16em', color: on ? RED : 'var(--color-ink-2)' }}
      >
        {on ? 'ON' : 'OFF'}
      </span>
      <span
        className="relative block"
        style={{
          width: 40,
          height: 20,
          background: on ? RED : 'var(--color-ice-3)',
          boxShadow: on ? 'none' : 'inset 0 0 0 1px rgba(13,27,42,0.14)',
        }}
      >
        <span
          className="setup-toggle-thumb absolute top-[3px] left-[3px] block"
          style={{ width: 14, height: 14, transform: `translateX(${on ? 20 : 0}px)`, background: on ? 'var(--color-ice-0)' : INK }}
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
      className="setup-option btn-ice flex min-w-0 flex-col gap-2 p-4 text-left"
      style={{
        border: 'none',
        borderLeft: `6px solid ${on ? edge : DEAD}`,
        borderRadius: 0,
        background: on ? 'color-mix(in srgb, var(--color-red) 5%, var(--color-ice-0))' : 'var(--color-ice-0)',
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
      {meta && (
        <MonoLabel size={9} tracking="0.16em">
          {meta}
        </MonoLabel>
      )}
      {desc && <span style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--color-ink-2)' }}>{desc}</span>}
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
  const { count: availableCount, loading: poolLoading, error: poolError, retry: retryPool } = useSetupPool(config)

  const game = useStorage((root) => root.game)
  const saveSettings = useSaveSettings()

  useEffect(() => {
    params.then(({ roomId }) => setRoomId(roomId))
    const guest = getOrCreateGuest()
    setMyId(guest.id)
  }, [params])

  const isHost = game?.hostId === myId || game?.hostId === ''

  function toggle<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]
  }

  function handleStart() {
    if (!canStart || starting) return
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
    !poolError && availableCount !== null && availableCount >= config.questionCount

  const selectedMode = GAME_MODES.find((m) => m.mode === config.gameMode)!
  const modeLabel = selectedMode.label.toUpperCase()
  const tiersLabel =
    config.difficultyTiers.length > 0
      ? config.difficultyTiers.map((t) => t.toUpperCase()).join(' + ')
      : '-'
  const configSummary = `${modeLabel} · ${tiersLabel} · ${config.eras.length} ERA${config.eras.length === 1 ? '' : 'S'} · ${config.questionCount} Q`

  const poolMessage = poolError ? 'Could not load the pool. Try again.'
    : poolLoading ? 'Checking eligible players…'
    : !config.difficultyTiers.length ? 'Choose at least one difficulty.'
    : !config.eras.length ? 'Choose at least one era.'
    : availableCount === 0 ? isCareer ? 'No matches. Try more eras or a shorter minimum career.' : 'No matches. Try more eras or difficulty tiers.'
    : availableCount! < config.questionCount ? `Choose fewer ${isCareer ? 'rounds' : 'questions'} or broaden your pool.`
    : isCareer ? 'Fresh careers for tonight. Previously played today are excluded.' : 'Your pool is ready.'
  const startLabel = starting ? 'Starting…' : poolLoading ? 'Checking pool…'
    : poolError ? 'Pool unavailable' : !canStart && isHost ? 'Adjust your settings' : 'Continue to lobby'

  return (
    <main className="setup-page ice-bg relative flex min-h-screen flex-col overflow-x-hidden">
      <RinkBg intensity={0.65} />
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
            <MonoLabel size={9} tracking="0.22em">
              Room {roomId}
            </MonoLabel>
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft size={14} strokeWidth={2.2} />
              Back
            </Button>
          </div>
        </div>
        <Kickplate />
      </header>

      <div className="setup-content relative z-[2] mx-auto w-full max-w-[1100px]">
        <div className="setup-heading">
          <h1 className="font-display">Set up your game</h1>
          <ol className="setup-steps" aria-label="Game setup progress">
            <li aria-current="step"><span>1</span> Game setup</li>
            <li><span>2</span> Lobby &amp; lineup</li>
          </ol>
        </div>

        <section className="setup-mode-picker" aria-label="Game mode">
          <div className="setup-mode-options">
            {GAME_MODES.map((m) => (
              <button
                key={m.mode}
                type="button"
                className="setup-mode btn-ice"
                aria-pressed={config.gameMode === m.mode}
                aria-describedby={config.gameMode === m.mode ? 'setup-mode-description' : undefined}
                disabled={!isHost}
                onClick={() => setConfig((c) => ({ ...c, gameMode: m.mode }))}
              >
                <span className="font-display">{m.label}</span>
                {config.gameMode === m.mode && <Check size={16} strokeWidth={2.4} aria-hidden="true" />}
              </button>
            ))}
          </div>
          <div className="setup-mode-context">
            <p id="setup-mode-description">{selectedMode.desc}</p>
            {isCareer && (
              <details className="setup-career-guide">
                <summary>How to play <ChevronDown size={14} aria-hidden="true" /></summary>
                <div className="setup-career-brief">
                  <p>Recognize the player before the full career unfolds.</p>
                  <ol className="setup-career-sequence" aria-label="How Career works">
                    <li>
                      <Eye size={20} strokeWidth={2.2} aria-hidden="true" />
                      <div><strong>Watch</strong><span>A season every 3 seconds</span></div>
                    </li>
                    <li>
                      <BellRing size={20} strokeWidth={2.2} aria-hidden="true" />
                      <div><strong>Buzz in</strong><span>First to buzz takes the shot</span></div>
                    </li>
                    <li>
                      <UserRoundCheck size={20} strokeWidth={2.2} aria-hidden="true" />
                      <div><strong>Name him</strong><span>Earlier guesses earn more</span></div>
                    </li>
                  </ol>
                </div>
              </details>
            )}
          </div>
        </section>

        <div className="grid items-start gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          {/* ── Difficulty + eras ── */}
          <div className="flex flex-col gap-4">
            <Group label="Difficulty · pick any">
              {isCareer && <p className="setup-help">Based on each player’s best season across their full career.</p>}
              <div className="grid grid-cols-2 gap-2.5">
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
              {isCareer && <p className="setup-help">Players who appeared in any selected era. Their entire career stays in play.</p>}
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
                {isCareer ? <MonoLabel>Buzz in and type</MonoLabel> : (
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

                </>
              )}

              {(isClassic || isCareer) && (
                <FormatRow label="Hints">
                  <Toggle
                    label="Hints"
                    on={config.hintsEnabled}
                    onClick={() => setConfig((c) => ({ ...c, hintsEnabled: !c.hintsEnabled }))}
                    disabled={!isHost}
                  />
                </FormatRow>
              )}

              {isClassic && (
                <FormatRow label="Power plays">
                  <PowerPlayHelp />
                  <Toggle
                    label="Power plays"
                    on={config.powerupsEnabled}
                    onClick={() => setConfig((c) => ({ ...c, powerupsEnabled: !c.powerupsEnabled }))}
                    disabled={!isHost}
                  />
                </FormatRow>
              )}

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
                  <FormatRow label="Season years">
                    {[{ value: true, label: 'Show years' }, { value: false, label: 'Hide years' }].map(({ value, label }) => (
                      <SegBtn
                        key={label}
                        on={config.careerShowYears === value}
                        onClick={() => setConfig((c) => ({ ...c, careerShowYears: value }))}
                        disabled={!isHost}
                      >
                        {label}
                      </SegBtn>
                    ))}
                  </FormatRow>
                  <p className="setup-help">
                    {config.careerShowYears
                      ? 'Years are shown. Era is omitted from hints.'
                      : 'Seasons stay in order without years. Era is available when hints are on. Years appear after the round.'}
                  </p>
                  <FormatRow label="Season reveals">
                    <MonoLabel>Full career · First season first · Every 3 seconds</MonoLabel>
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
                </>
              )}
            </div>
          </Group>
        </div>
      </div>

      {/* ── Start bar: the boards at the foot of the screen ── */}
      <div className="setup-boards fixed inset-x-0 bottom-0 z-40">
        <Kickplate height={4} />
        <div className="setup-boards-inner">
          <JumbotronPanel bezel={5} screenPad="10px 14px" className="setup-pool-board">
            <div role="status" aria-live="polite" aria-atomic="true" aria-busy={poolLoading}>
              <div className="setup-pool-score">
                <AnimatedPoolCount count={availableCount} />
                <span className="font-mono setup-pool-label">{poolLoading ? 'Checking pool' : poolError ? 'Pool unavailable' : 'In pool'}<small>{isCareer ? 'Eligible careers' : 'Season stat lines'}</small></span>
              </div>
            </div>
          </JumbotronPanel>
          <div className="setup-pool-context">
            <p role={poolError ? 'alert' : undefined}>{poolMessage}</p>
            {poolError && <button type="button" onClick={retryPool} className="setup-retry">Retry pool</button>}
            <span className="font-mono setup-summary">{configSummary}</span>
          </div>
          <div className="setup-continue">
            {isHost ? (
              <Button variant="primary" size="md" onClick={handleStart} disabled={!canStart || starting} className="w-full">
                {startLabel}<ArrowRight size={16} strokeWidth={2.2} />
              </Button>
            ) : <MonoLabel size={10} tracking="0.16em">Waiting for host</MonoLabel>}
          </div>
        </div>
      </div>
    </main>
  )
}
