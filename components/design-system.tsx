'use client'

import { motion, HTMLMotionProps } from 'framer-motion'
import type { DifficultyTier } from '@/types/game'

// Cards on Ice. Mirrors the @theme tokens in app/globals.css for inline styles.
const INK = 'var(--color-ink)'
const INK_2 = 'var(--color-ink-2)'
const COBALT = 'var(--color-cobalt)'
const ALARM = 'var(--color-alarm)'

// ─── Button ───────────────────────────────────────────────────────────────────
// Anton caps on a pill in a 3px ink frame. Primary and ghost carry the hard
// offset; pressing sinks the button into it.

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  /** Flush against its container - no frame or offset, fills the cell. Used in 2-up bars. */
  flush?: boolean
}

const variantStyles: Record<
  NonNullable<ButtonProps['variant']>,
  { bg: string; fg: string; hover: string; offset: boolean }
> = {
  primary: { bg: COBALT, fg: '#ffffff', hover: 'var(--color-cobalt-hover)', offset: true },
  secondary: { bg: INK, fg: '#ffffff', hover: '#22325a', offset: false },
  danger: { bg: ALARM, fg: '#ffffff', hover: '#b8241a', offset: true },
  ghost: { bg: '#ffffff', fg: INK, hover: 'var(--color-ice-1)', offset: true },
}

const sizeStyles = {
  sm: { padding: '10px 18px', fontSize: 16, minHeight: 44 },
  md: { padding: '12px 24px', fontSize: 19, minHeight: 50 },
  lg: { padding: '14px 30px', fontSize: 23, minHeight: 58 },
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
  const offset = v.offset && !flush && !disabled

  return (
    <motion.button
      whileHover={!disabled ? { backgroundColor: v.hover } : undefined}
      whileTap={
        !disabled && !flush
          ? { x: 2, y: 2, boxShadow: offset ? `2px 2px 0 ${INK}` : 'none' }
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
          border: flush ? 'none' : `3px solid ${INK}`,
          borderRadius: flush ? 0 : 999,
          padding: flush ? '18px 0' : s.padding,
          minHeight: s.minHeight,
          width: flush ? '100%' : undefined,
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontFamily: 'var(--font-display)',
          fontWeight: 400,
          fontSize: s.fontSize,
          lineHeight: 1,
          letterSpacing: '0.03em',
          textTransform: 'uppercase',
          boxShadow: offset ? `4px 4px 0 ${INK}` : 'none',
          opacity: disabled ? 0.45 : 1,
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
// The card-back voice: Space Mono bold caps. Never below 10px or lighter than ink-2.

export function MonoLabel({
  children,
  size = 11,
  tracking = '0.06em',
  color = INK_2,
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
        fontSize: Math.max(10, size),
        fontWeight: 700,
        letterSpacing: tracking,
        color,
        textTransform: 'uppercase',
        lineHeight: 1.1,
      }}
    >
      {children}
    </span>
  )
}

// ─── TierBadge ────────────────────────────────────────────────────────────────
// A pill in an ink frame. The range is always in the label, never only the colour.

interface BadgeProps {
  tier: DifficultyTier
  className?: string
}

const tierConfig: Record<DifficultyTier, { label: string; bg: string; fg: string }> = {
  easy: { label: 'Easy · 140+', bg: '#ffffff', fg: INK },
  medium: { label: 'Medium · 120–139', bg: COBALT, fg: '#ffffff' },
  hard: { label: 'Hard · 100–119', bg: 'var(--color-tangerine)', fg: INK },
  expert: { label: 'Expert · 70–99', bg: 'var(--color-lemon)', fg: INK },
}

export function TierBadge({ tier, className = '' }: BadgeProps) {
  const cfg = tierConfig[tier]
  return (
    <span
      className={`font-mono inline-flex items-center ${className}`}
      style={{
        background: cfg.bg,
        color: cfg.fg,
        border: `2px solid ${INK}`,
        borderRadius: 999,
        padding: '4px 10px',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        lineHeight: 1.1,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </span>
  )
}

// ─── ProgressTrack ────────────────────────────────────────────────────────────
// A rounded time track. Under 5s the fill turns alarm red and pulses; it never shakes.

export function ProgressTrack({
  fraction,
  urgent = false,
  height = 8,
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
      style={{ height, background: 'var(--color-ice-2)', borderRadius: 999, overflow: 'hidden' }}
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
          background: urgent ? ALARM : COBALT,
          borderRadius: 999,
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
      {label && <MonoLabel size={10}>{label}</MonoLabel>}
      <span
        className="font-display tabular-nums"
        style={{
          fontWeight: 400,
          fontSize: size,
          lineHeight: 0.85,
          color: urgent ? ALARM : INK,
        }}
      >
        {text}
      </span>
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
      style={{ background: 'rgba(20,33,61,0.55)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        className={`on-ice w-full max-w-md overflow-hidden p-7 ${className}`}
        style={{ boxShadow: `8px 8px 0 ${INK}` }}
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
        fontWeight: 400,
        fontSize: size,
        lineHeight: 0.95,
        letterSpacing: '0.01em',
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
