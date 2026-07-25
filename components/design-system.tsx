'use client'

import { motion, HTMLMotionProps } from 'framer-motion'
import type { DifficultyTier } from '@/types/game'
import { CBrand } from './arcade/Brand'

// ─── Panel ────────────────────────────────────────────────────────────────────

interface PanelProps {
  children: React.ReactNode
  className?: string
  glow?: boolean
}

export function Panel({ children, className = '' }: PanelProps) {
  return <div className={`bg-white card-puffy ${className}`}>{children}</div>
}

// ─── Button ───────────────────────────────────────────────────────────────────

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

const variantStyles: Record<string, { bg: string; fg: string }> = {
  primary: { bg: '#e32437', fg: '#ffffff' },
  secondary: { bg: '#003087', fg: '#ffffff' },
  danger: { bg: '#e32437', fg: '#ffffff' },
  ghost: { bg: '#ffffff', fg: '#0a1535' },
}

const sizeStyles = {
  sm: { padding: '9px 16px', fontSize: 13, borderRadius: 12, shadow: 3 },
  md: { padding: '13px 20px', fontSize: 15, borderRadius: 12, shadow: 4 },
  lg: { padding: '16px 26px', fontSize: 18, borderRadius: 12, shadow: 5 },
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  style,
  ...props
}: ButtonProps) {
  const v = variantStyles[variant]
  const s = sizeStyles[size]

  return (
    <motion.button
      whileHover={!disabled ? { y: -2, boxShadow: `0 ${s.shadow + 2}px 0 #0a1535` } : undefined}
      whileTap={!disabled ? { y: 2, boxShadow: `0 2px 0 #0a1535` } : undefined}
      transition={{ duration: 0.1 }}
      disabled={disabled}
      style={
        {
          backgroundColor: v.bg,
          color: v.fg,
          border: '2px solid #0a1535',
          borderRadius: s.borderRadius,
          padding: s.padding,
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
          fontSize: s.fontSize,
          lineHeight: 1,
          letterSpacing: '0.01em',
          boxShadow: `0 ${s.shadow}px 0 #0a1535`,
          opacity: disabled ? 0.4 : 1,
          ...style,
        } as React.CSSProperties
      }
      className={`btn-puffy ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  )
}

// ─── TierBadge ────────────────────────────────────────────────────────────────

interface BadgeProps {
  tier: DifficultyTier
  className?: string
}

const tierConfig: Record<DifficultyTier, { label: string; bg: string; fg: string }> = {
  easy: { label: 'Easy', bg: '#2cc66b', fg: '#ffffff' },
  medium: { label: 'Medium', bg: '#003087', fg: '#ffffff' },
  hard: { label: 'Hard', bg: '#e32437', fg: '#ffffff' },
  expert: { label: 'Expert', bg: '#ffcf33', fg: '#0a1535' },
}

export function TierBadge({ tier, className = '' }: BadgeProps) {
  const cfg = tierConfig[tier]
  return (
    <span
      className={`inline-flex items-center ${className}`}
      style={{
        background: cfg.bg,
        color: cfg.fg,
        border: '2px solid #0a1535',
        borderRadius: 9999,
        padding: '3px 12px',
        fontFamily: 'var(--font-archivo-black), "Archivo Black", sans-serif',
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
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

export function Avatar({ url, name, size = 40, className = '' }: AvatarProps) {
  return (
    <div
      className={`overflow-hidden flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        border: '2px solid #0a1535',
        borderRadius: 12,
        background: '#fff',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={name} width={size} height={size} className="w-full h-full object-cover" />
    </div>
  )
}

// ─── PlayerChip ───────────────────────────────────────────────────────────────

interface PlayerChipProps {
  name: string
  avatarUrl: string
  score: number
  isHost?: boolean
  isBoss?: boolean
  isMe?: boolean
  size?: 'sm' | 'md'
  /** Overrides the "{score} pts" meta line (e.g. "READY"). */
  statusLabel?: string
}

export function PlayerChip({
  name,
  avatarUrl,
  score,
  isHost,
  isBoss,
  isMe,
  size = 'md',
  statusLabel,
}: PlayerChipProps) {
  const avatarSize = size === 'sm' ? 28 : 40

  return (
    <div
      className="card-puffy-sm flex items-center"
      style={{
        gap: 10,
        padding: size === 'sm' ? '6px 10px' : '10px 14px',
        background: isMe ? '#003087' : '#ffffff',
        color: isMe ? '#ffffff' : '#0a1535',
      }}
    >
      <div
        style={{
          width: avatarSize,
          height: avatarSize,
          border: `2px solid ${isMe ? '#fff' : '#0a1535'}`,
          borderRadius: 10,
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt={name}
          width={avatarSize}
          height={avatarSize}
          className="w-full h-full object-cover"
        />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          <span
            style={{
              fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
              fontSize: size === 'sm' ? 13 : 16,
              lineHeight: 1,
              color: isMe ? '#ffffff' : '#0a1535',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </span>
          {isHost && (
            <span
              style={{
                background: '#e32437',
                color: '#fff',
                padding: '2px 7px',
                fontFamily: 'var(--font-archivo-black), sans-serif',
                fontSize: 9,
                borderRadius: 5,
                border: '1.5px solid #0a1535',
                letterSpacing: '0.14em',
              }}
            >
              HOST
            </span>
          )}
          {isBoss && (
            <span
              style={{
                background: '#ffcf33',
                color: '#0a1535',
                padding: '2px 7px',
                fontFamily: 'var(--font-archivo-black), sans-serif',
                fontSize: 9,
                borderRadius: 5,
                border: '1.5px solid #0a1535',
                letterSpacing: '0.14em',
              }}
            >
              👑 BOSS
            </span>
          )}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-jetbrains-mono), "JetBrains Mono", monospace',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: isMe ? 'rgba(255,255,255,0.7)' : '#6b7ea0',
            marginTop: 3,
          }}
        >
          {statusLabel ?? `${score} pts`}
        </div>
      </div>
    </div>
  )
}

// ─── CountdownRing ────────────────────────────────────────────────────────────

interface CountdownRingProps {
  seconds: number
  total: number
  size?: number
  className?: string
}

export function CountdownRing({ seconds, total, size = 76, className = '' }: CountdownRingProps) {
  const strokeWidth = size >= 100 ? 9 : 7
  const radius = (size - strokeWidth - 4) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.max(0, Math.min(1, seconds / total))
  const dashOffset = circumference * (1 - progress)
  const cx = size / 2
  const cy = size / 2
  const fontSize = size >= 100 ? 38 : 26

  return (
    <div className={`relative flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="#d3e3ff"
          fill="white"
        />
        {/* Progress */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="#e32437"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transition={{ duration: 1, ease: 'linear' }}
        />
        {/* Center number - rendered in SVG space so it rotates back correctly */}
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#e32437"
          fontFamily='var(--font-bungee), "Bungee", sans-serif'
          fontSize={fontSize}
          style={{
            transform: `rotate(90deg)`,
            transformOrigin: `${cx}px ${cy}px`,
            fontWeight: 400,
          }}
        >
          {Math.ceil(seconds)}
        </text>
      </svg>
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
      style={{ background: 'rgba(10,21,53,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`bg-white card-puffy p-6 max-w-md w-full ${className}`}
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
  className?: string
}

export function GameHeading({ children, className = '' }: GameHeadingProps) {
  return (
    <h1
      className={className}
      style={{
        fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
        fontSize: 36,
        lineHeight: 0.9,
        color: '#0a1535',
        letterSpacing: '-0.01em',
        margin: 0,
      }}
    >
      {children}
    </h1>
  )
}

// ─── GameLogo ─────────────────────────────────────────────────────────────────

export function GameLogo({ className = '' }: { className?: string }) {
  return <CBrand className={className} />
}

// ─── GameDivider ─────────────────────────────────────────────────────────────

export function GameDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div style={{ flex: 1, height: 1, background: '#003087' }} />
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#e32437' }} />
      <div style={{ flex: 1, height: 1, background: '#e32437' }} />
    </div>
  )
}

// ─── StatLabel ───────────────────────────────────────────────────────────────

export function StatLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-block',
        background: '#0a1535',
        color: '#ffffff',
        borderRadius: 9999,
        padding: '2px 8px',
        fontFamily: 'var(--font-archivo-black), "Archivo Black", sans-serif',
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </span>
  )
}
