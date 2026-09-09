'use client'

import { motion, HTMLMotionProps } from 'framer-motion'
import type { DifficultyTier } from '@/types/game'

const INK = '#0d1b2a'
const RED = '#cf0a2c'

// ─── Button ───────────────────────────────────────────────────────────────────

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  /** Flush against its container — no shadow, fills the cell. Used in 2-up bars. */
  flush?: boolean
}

const variantStyles: Record<string, { bg: string; fg: string; hover: string }> = {
  primary: { bg: RED, fg: '#ffffff', hover: '#b80927' },
  secondary: { bg: INK, fg: '#eef3f9', hover: '#16283c' },
  danger: { bg: RED, fg: '#ffffff', hover: '#b80927' },
  ghost: { bg: '#ffffff', fg: INK, hover: '#f4f7fa' },
}

const sizeStyles = {
  sm: { padding: '11px 18px', fontSize: 15, tracking: '0.12em' },
  md: { padding: '15px 26px', fontSize: 18, tracking: '0.13em' },
  lg: { padding: '17px 30px', fontSize: 21, tracking: '0.14em' },
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  flush = false,
  className = '',
  disabled,
  style,
  ...props
}: ButtonProps) {
  const v = variantStyles[variant]
  const s = sizeStyles[size]
  // Hard offsets survive only on the primary action, and only when not flush.
  const offset = variant === 'primary' && !flush
  const ghostRule = variant === 'ghost' ? 'inset 0 0 0 1px rgba(13,27,42,0.14)' : ''
  const rest = [offset ? `0 3px 0 ${INK}` : '', ghostRule].filter(Boolean).join(', ') || 'none'

  return (
    <motion.button
      whileHover={!disabled ? { backgroundColor: v.hover } : undefined}
      whileTap={
        !disabled
          ? {
              y: 1,
              boxShadow:
                [offset ? `0 2px 0 ${INK}` : '', ghostRule].filter(Boolean).join(', ') || 'none',
            }
          : undefined
      }
      transition={{ duration: 0.1 }}
      disabled={disabled}
      style={
        {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          backgroundColor: v.bg,
          color: v.fg,
          border: 'none',
          borderRadius: 0,
          padding: flush ? '18px 0' : s.padding,
          width: flush ? '100%' : undefined,
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: s.fontSize,
          lineHeight: 1,
          letterSpacing: s.tracking,
          textTransform: 'uppercase',
          boxShadow: rest,
          opacity: disabled ? 0.4 : 1,
          ...style,
        } as React.CSSProperties
      }
      className={`btn-ice ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  )
}

// ─── MonoLabel ────────────────────────────────────────────────────────────────
// The system's small-caps voice. Never below 9px, never lighter than #55677d.

export function MonoLabel({
  children,
  size = 10,
  tracking = '0.24em',
  color = '#55677d',
  className = '',
}: {
  children: React.ReactNode
  size?: number
  tracking?: string
  color?: string
  className?: string
}) {
  return (
    <span
      className={`font-mono ${className}`}
      style={{
        fontSize: Math.max(9, size),
        letterSpacing: tracking,
        color,
        textTransform: 'uppercase',
        lineHeight: 1,
      }}
    >
      {children}
    </span>
  )
}

// ─── TierBadge ────────────────────────────────────────────────────────────────
// A square mono chip. Tier is carried by the label, not only by the colour.

interface BadgeProps {
  tier: DifficultyTier
  className?: string
}

const tierConfig: Record<DifficultyTier, { label: string; bg: string; fg: string }> = {
  easy: { label: 'Easy · 140+', bg: INK, fg: '#eef3f9' },
  medium: { label: 'Medium · 120–139', bg: 'rgba(11,83,201,0.12)', fg: '#0b53c9' },
  hard: { label: 'Hard · 100–119', bg: RED, fg: '#ffffff' },
  expert: { label: 'Expert · 70–99', bg: 'var(--color-amber)', fg: INK },
}

export function TierBadge({ tier, className = '' }: BadgeProps) {
  const cfg = tierConfig[tier]
  return (
    <span
      className={`font-mono inline-flex items-center ${className}`}
      style={{
        background: cfg.bg,
        color: cfg.fg,
        borderRadius: 0,
        padding: '4px 9px',
        fontSize: 9,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </span>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

interface AvatarProps {
  url: string
  name: string
  size?: number
  className?: string
}

export function Avatar({ url, name, size = 34, className = '' }: AvatarProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={name}
      width={size}
      height={size}
      className={`shrink-0 object-cover ${className}`}
      style={{ width: size, height: size, borderRadius: 3, background: '#e4ecf5' }}
    />
  )
}

// ─── ProgressTrack ────────────────────────────────────────────────────────────
// The 6px time track. Under 5s the fill pulses; it never shakes or scales.

export function ProgressTrack({
  fraction,
  urgent = false,
  height = 6,
  className = '',
}: {
  fraction: number
  urgent?: boolean
  height?: number
  className?: string
}) {
  const pct = Math.max(0, Math.min(1, fraction)) * 100
  return (
    <div
      className={`w-full ${className}`}
      style={{ height, background: 'rgba(13,27,42,0.10)' }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={urgent ? 'timer-urgent' : ''}
        style={{
          height,
          width: `${pct}%`,
          background: RED,
          transition: 'width 0.4s linear',
        }}
      />
    </div>
  )
}

// ─── Clock ────────────────────────────────────────────────────────────────────

export function Clock({
  seconds,
  size = 70,
  label = 'TIME',
  align = 'end',
}: {
  seconds: number
  size?: number
  label?: string | null
  align?: 'start' | 'end'
}) {
  const s = Math.max(0, Math.floor(seconds))
  const urgent = s < 5
  const text = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className={`flex flex-col gap-1 ${align === 'end' ? 'items-end' : 'items-start'}`}>
      {label && <MonoLabel size={9}>{label}</MonoLabel>}
      <span
        className="font-display tabular-nums"
        style={{
          fontWeight: 800,
          fontSize: size,
          lineHeight: 0.8,
          color: urgent ? RED : INK,
        }}
      >
        {text}
      </span>
    </div>
  )
}

// ─── Kickplate ────────────────────────────────────────────────────────────────
// The amber padding at the base of the boards. Trim only — never a fill.

export function Kickplate({ height = 5 }: { height?: number }) {
  return <div aria-hidden="true" style={{ height, background: 'var(--color-amber)' }} />
}

// ─── Ticker ───────────────────────────────────────────────────────────────────

export function Ticker({ items }: { items: string[] }) {
  if (items.length === 0) return null

  return (
    <div
      className="relative flex h-9 items-center gap-[26px] overflow-hidden px-5"
      style={{ background: INK }}
    >
      <span
        className="font-mono shrink-0"
        style={{
          fontSize: 9,
          letterSpacing: '0.24em',
          color: '#fff',
          background: RED,
          padding: '4px 8px',
        }}
      >
        LIVE
      </span>
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="ticker-track">
          {/* Two copies so the marquee loops seamlessly at -50%; the second is
              decorative, so only the first is announced. */}
          {[false, true].map((isClone) => (
            <div
              key={String(isClone)}
              className="flex shrink-0 items-center gap-[26px] pr-[26px]"
              aria-hidden={isClone || undefined}
            >
              {items.map((item, i) => (
                <span
                  key={i}
                  className="font-mono"
                  style={{ fontSize: 10, letterSpacing: '0.12em', color: '#55677d' }}
                >
                  {item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean
  onClose?: () => void
  children: React.ReactNode
  className?: string
}

export function Modal({ open, onClose, children, className = '' }: ModalProps) {
  if (!open) return null
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(13,27,42,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        className={`on-ice w-full max-w-md p-7 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

// ─── GameHeading ─────────────────────────────────────────────────────────────

interface GameHeadingProps {
  children: React.ReactNode
  size?: number
  className?: string
  style?: React.CSSProperties
}

export function GameHeading({ children, size = 50, className = '', style }: GameHeadingProps) {
  return (
    <h1
      className={`font-display ${className}`}
      style={{
        fontWeight: 800,
        fontSize: size,
        lineHeight: 0.9,
        letterSpacing: '0.005em',
        color: INK,
        textTransform: 'uppercase',
        margin: 0,
        ...style,
      }}
    >
      {children}
    </h1>
  )
}
