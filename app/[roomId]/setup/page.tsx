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

const TIER_OPTIONS: {
  tier: DifficultyTier
  label: string
  range: string
  desc: string
  emoji: string
  color: string
}[] = [
  { tier: 'easy',   label: 'Easy',   range: '140+',    desc: 'Legends', emoji: '🥇', color: '#2cc66b' },
  { tier: 'medium', label: 'Medium', range: '120–139', desc: 'Greats',  emoji: '⭐', color: '#003087' },
  { tier: 'hard',   label: 'Hard',   range: '100–119', desc: '',        emoji: '🔥', color: '#e32437' },
  { tier: 'expert', label: 'Expert', range: '70–99',   desc: '',        emoji: '💀', color: '#ffcf33' },
]

const GAME_MODES: { mode: GameMode; label: string; desc: string; emoji: string; color: string }[] = [
  { mode: 'classic',      label: 'Classic',      desc: 'Guess the player from a single season', emoji: '🏒', color: '#e32437' },
  { mode: 'career',       label: 'Career',       desc: 'Seasons revealed one by one — buzz in!', emoji: '📈', color: '#003087' },
  { mode: 'h2h',          label: 'Head-to-Head', desc: 'Which stat line belongs to this player?', emoji: '🤼', color: '#ffcf33' },
  { mode: 'higher-lower', label: 'Higher / Lower', desc: 'Did they score more or less?',        emoji: '⚖️', color: '#2cc66b' },
]

const HL_FIELDS: { value: HLComparisonField; label: string }[] = [
  { value: 'points', label: 'Points' },
  { value: 'goals', label: 'Goals' },
  { value: 'assists', label: 'Assists' },
  { value: 'penaltyMinutes', label: 'Penalty Minutes' },
  { value: 'gamesPlayed', label: 'Games Played' },
]

const CAREER_REVEAL_ORDERS: { value: CareerRevealOrder; label: string }[] = [
  { value: 'best-first',    label: 'Best First' },
  { value: 'worst-first',   label: 'Worst First' },
  { value: 'chronological', label: 'Chronological' },
  { value: 'random',        label: 'Random' },
]

const BUNGEE = 'var(--font-bungee), "Bungee", sans-serif'
const BODY = 'var(--font-body), "Space Grotesk", sans-serif'
const MONO = 'var(--font-jetbrains-mono), "JetBrains Mono", monospace'
const ARCHIVO = 'var(--font-archivo-black), "Archivo Black", sans-serif'

// ─── Small section label (muted Archivo) ──────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: ARCHIVO,
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: '0.22em',
        color: '#6b7ea0',
        textTransform: 'uppercase',
        margin: 0,
      }}
    >
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
      style={{
        width: 44,
        height: 24,
        borderRadius: 9999,
        border: '2px solid #0a1535',
        background: on ? '#2cc66b' : '#eef1f8',
        position: 'relative',
        padding: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.1s',
        opacity: disabled ? 0.6 : 1,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 1,
          left: on ? 21 : 1,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#fff',
          border: '2px solid #0a1535',
          transition: 'left 0.1s',
        }}
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
      style={{
        background: on ? '#003087' : '#fff',
        color: on ? '#fff' : '#0a1535',
        border: '2px solid #0a1535',
        borderRadius: 9,
        padding: small ? '6px 9px' : '8px 14px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: on ? '0 3px 0 #0a1535' : '0 2px 0 rgba(10,21,53,0.25)',
        fontFamily: BUNGEE,
        fontSize: small ? 11 : 13,
        lineHeight: 1,
        transition: 'all 0.1s',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  )
}

// ─── Format row (label left, control right) ────────────────────────────────────

function FormatRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ fontFamily: BODY, fontWeight: 700, fontSize: 13, color: '#0a1535' }}>{label}</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {children}
      </div>
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
    return () => { active = false }
  }, [config.gameMode, config.difficultyTiers, config.eras, config.rookiesOnly, config.careerMinSeasons])

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
  const isCareer  = config.gameMode === 'career'
  const isH2H     = config.gameMode === 'h2h'
  const isHL      = config.gameMode === 'higher-lower'

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
    <main className="ice-bg min-h-screen" style={{ padding: 22 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <CBrand small />
          <div className="flex items-center" style={{ gap: 10 }}>
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              ◁ BACK
            </Button>
            <div
              style={{
                background: '#fff',
                border: '2px solid #0a1535',
                borderRadius: 9999,
                padding: '6px 14px',
                display: 'inline-flex',
                alignItems: 'center',
                boxShadow: '0 2px 0 rgba(10,21,53,0.25)',
              }}
            >
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  color: '#0a1535',
                }}
              >
                ROOM · {roomId}
              </span>
            </div>
          </div>
        </div>

        {/* ── Title row ── */}
        <div className="flex items-center" style={{ gap: 14 }}>
          <span
            style={{
              display: 'inline-block',
              background: '#ffcf33',
              border: '2px solid #0a1535',
              borderRadius: 9999,
              padding: '4px 12px',
              fontFamily: ARCHIVO,
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: '0.22em',
              color: '#0a1535',
              boxShadow: '0 2px 0 rgba(10,21,53,0.25)',
            }}
          >
            STEP 1 OF 2
          </span>
          <h2
            style={{
              fontFamily: BUNGEE,
              fontSize: 30,
              lineHeight: 1,
              color: '#0a1535',
              margin: 0,
            }}
          >
            SET UP YOUR GAME
          </h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {/* ── Game-mode grid (4 cols) ── */}
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {GAME_MODES.map((m) => {
              const on = config.gameMode === m.mode
              const fg = on ? (m.color === '#ffcf33' ? '#0a1535' : '#fff') : '#0a1535'
              return (
                <button
                  key={m.mode}
                  disabled={!isHost}
                  onClick={() => setConfig((c) => ({ ...c, gameMode: m.mode }))}
                  style={{
                    background: on ? m.color : '#fff',
                    color: fg,
                    border: '2px solid #0a1535',
                    borderRadius: 14,
                    padding: 16,
                    cursor: isHost ? 'pointer' : 'not-allowed',
                    boxShadow: on ? '0 5px 0 #0a1535' : '0 2px 0 rgba(10,21,53,0.25)',
                    textAlign: 'left',
                    transition: 'all 0.1s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 20, lineHeight: 1 }}>{m.emoji}</span>
                  <div style={{ fontFamily: BUNGEE, fontSize: 15, lineHeight: 1 }}>{m.label}</div>
                  <div
                    style={{
                      fontFamily: BODY,
                      fontSize: 12,
                      lineHeight: 1.35,
                      opacity: on ? 0.9 : 0.7,
                    }}
                  >
                    {m.desc}
                  </div>
                </button>
              )
            })}
          </div>

          {/* ── Two-column area ── */}
          <div className="grid gap-4" style={{ gridTemplateColumns: '1.1fr 0.9fr', alignItems: 'start' }}>

            {/* ── LEFT: Difficulty + Eras ── */}
            <div
              style={{
                background: '#fff',
                border: '2px solid #0a1535',
                borderRadius: 16,
                padding: 20,
                boxShadow: '0 4px 0 #0a1535',
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
              }}
            >
              {/* Difficulty */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <SectionLabel>Difficulty · Pick Any</SectionLabel>
                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  {TIER_OPTIONS.map(({ tier, label, range, desc, emoji, color }) => {
                    const on = config.difficultyTiers.includes(tier)
                    const fg = on ? (color === '#ffcf33' ? '#0a1535' : '#fff') : '#0a1535'
                    const metaColor = on ? (color === '#ffcf33' ? 'rgba(10,21,53,0.75)' : 'rgba(255,255,255,0.85)') : '#6b7ea0'
                    const line = desc ? `${range} · ${desc.toUpperCase()}` : range
                    return (
                      <button
                        key={tier}
                        disabled={!isHost}
                        onClick={() =>
                          setConfig((c) => ({ ...c, difficultyTiers: toggle(c.difficultyTiers, tier) }))
                        }
                        style={{
                          background: on ? color : '#fff',
                          color: fg,
                          border: '2px solid #0a1535',
                          borderRadius: 12,
                          padding: '10px 9px',
                          cursor: isHost ? 'pointer' : 'not-allowed',
                          boxShadow: on ? '0 3px 0 #0a1535' : '0 2px 0 rgba(10,21,53,0.25)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 5,
                          alignItems: 'flex-start',
                          textAlign: 'left',
                          transition: 'all 0.1s',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontSize: 14 }}>{emoji}</span>
                          <span style={{ fontFamily: BUNGEE, fontSize: 12, lineHeight: 1 }}>{label}</span>
                        </span>
                        <span
                          style={{
                            fontFamily: MONO,
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            color: metaColor,
                          }}
                        >
                          {line}
                        </span>
                      </button>
                    )
                  })}
                </div>
                {config.difficultyTiers.length === 0 && (
                  <p style={{ color: '#e32437', fontSize: 12, margin: 0, fontFamily: BODY }}>
                    Select at least one difficulty tier
                  </p>
                )}
              </div>

              {/* Eras */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <SectionLabel>Eras</SectionLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['1970s', '1980s', '1990s', '2000s', '2010s', '2020s'].map((era) => {
                    const on = config.eras.includes(era)
                    return (
                      <button
                        key={era}
                        disabled={!isHost}
                        onClick={() => setConfig((c) => ({ ...c, eras: toggle(c.eras, era) }))}
                        style={{
                          background: on ? '#003087' : '#eef1f8',
                          color: on ? '#fff' : '#6b7ea0',
                          border: `2px solid ${on ? '#0a1535' : '#9aa2bd'}`,
                          borderRadius: 9999,
                          padding: '6px 13px',
                          cursor: isHost ? 'pointer' : 'not-allowed',
                          boxShadow: on ? '0 2px 0 #0a1535' : 'none',
                          fontFamily: MONO,
                          fontSize: 12,
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          transition: 'all 0.1s',
                        }}
                      >
                        {era}{on ? ' ✓' : ''}
                      </button>
                    )
                  })}
                </div>
                {config.eras.length === 0 && (
                  <p style={{ color: '#e32437', fontSize: 12, margin: 0, fontFamily: BODY }}>
                    Select at least one era
                  </p>
                )}
              </div>
            </div>

            {/* ── RIGHT: Format ── */}
            <div
              style={{
                background: '#fff',
                border: '2px solid #0a1535',
                borderRadius: 16,
                padding: 20,
                boxShadow: '0 4px 0 #0a1535',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
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
                {([
                  { value: 'multiplechoice', label: 'MULTIPLE CHOICE' },
                  { value: 'freetext',        label: 'TYPE IT' },
                ] as { value: AnswerMode; label: string }[]).map(({ value, label }) => (
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
                    {([
                      { value: 'instant', label: 'ALL AT ONCE' },
                      { value: 'timed',   label: 'TIMED' },
                    ] as { value: RevealMode; label: string }[]).map(({ value, label }) => (
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

                  <FormatRow label="Rookies only">
                    <Toggle
                      on={config.rookiesOnly}
                      onClick={() => setConfig((c) => ({ ...c, rookiesOnly: !c.rookiesOnly }))}
                      disabled={!isHost}
                    />
                  </FormatRow>

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
          <div
            style={{
              background: '#0a1535',
              borderRadius: 14,
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              flexWrap: 'wrap',
              boxShadow: '0 2px 0 rgba(10,21,53,0.25)',
            }}
          >
            {availableCount !== null && (
              <span
                style={{
                  background: '#2cc66b',
                  color: '#0a1535',
                  border: '2px solid #0a1535',
                  borderRadius: 9999,
                  padding: '5px 12px',
                  fontFamily: ARCHIVO,
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                }}
              >
                ✓ {availableCount} PLAYERS IN POOL
              </span>
            )}
            <span
              style={{
                fontFamily: MONO,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: '#9fb3d9',
              }}
            >
              {configSummary}
            </span>
            <div style={{ marginLeft: 'auto' }}>
              {isHost ? (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleStart}
                  disabled={!canStart || starting}
                  style={{ border: '2px solid #fff' }}
                >
                  {starting
                    ? 'STARTING…'
                    : !canStart && availableCount !== null && availableCount < config.questionCount
                      ? 'NOT ENOUGH PLAYERS'
                      : 'CONTINUE TO LOBBY →'}
                </Button>
              ) : (
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.16em',
                    color: '#9fb3d9',
                  }}
                >
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
