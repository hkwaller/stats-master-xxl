'use client'

import { motion, HTMLMotionProps } from 'framer-motion'
import type { DifficultyTier } from '@/types/game'

// ─── Panel ────────────────────────────────────────────────────────────────────

interface PanelProps {
  children: React.ReactNode
  className?: string
  glow?: boolean
}

export function Panel({ children, className = '', glow = false }: PanelProps) {
  return (
    <div
      className={`
        bg-game-card border-4 border-black
        ${glow ? 'shadow-[8px_8px_0px_#000]' : 'shadow-[4px_4px_0px_#000]'}
        ${className}
      `}
    >
      {children}
    </div>
  )
}

// ─── Button ───────────────────────────────────────────────────────────────────

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

const variantClasses = {
  primary: 'bg-magenta text-white border-4 border-black shadow-[4px_4px_0px_#000]',
  secondary: 'bg-cyan text-black border-4 border-black shadow-[4px_4px_0px_#000]',
  danger: 'bg-game-red text-white border-4 border-black shadow-[4px_4px_0px_#000]',
  ghost: 'bg-game-bg border-4 border-black text-black shadow-[4px_4px_0px_#000]',
}

const sizeClasses = {
  sm: 'px-4 py-2 text-sm tracking-wide',
  md: 'px-6 py-3 text-base tracking-wider',
  lg: 'px-8 py-4 text-lg tracking-widest',
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileHover={!disabled ? { x: -2, y: -2, boxShadow: '6px 6px 0px #000' } : undefined}
      whileTap={!disabled ? { x: 2, y: 2, boxShadow: '0px 0px 0px #000' } : undefined}
      transition={{ duration: 0.05 }}
      disabled={disabled}
      className={`
        font-display cursor-pointer font-bold
        transition-colors duration-150
        disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
        ${variantClasses[variant]} ${sizeClasses[size]} ${className}
      `}
      {...props}
    >
      {children}
    </motion.button>
  )
}

// ─── Badge (difficulty tier) ──────────────────────────────────────────────────

interface BadgeProps {
  tier: DifficultyTier
  className?: string
}

const tierConfig: Record<DifficultyTier, { label: string; color: string }> = {
  easy: { label: 'Easy', color: 'bg-lime text-black border-black' },
  medium: { label: 'Medium', color: 'bg-cyan text-black border-black' },
  hard: { label: 'Hard', color: 'bg-magenta text-white border-black' },
  expert: { label: 'Expert', color: 'bg-game-red text-white border-black' },
}

export function TierBadge({ tier, className = '' }: BadgeProps) {
  const { label, color } = tierConfig[tier]
  return (
    <span
      className={`
        inline-flex items-center px-3 py-1 text-xs font-bold uppercase
        border-2 tracking-widest ${color} ${className} shadow-[2px_2px_0px_#000]
      `}
    >
      {label}
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
      className={`border-4 border-black overflow-hidden bg-white flex-shrink-0 ${className} shadow-[2px_2px_0_#000]`}
      style={{ width: size, height: size }}
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
}

export function PlayerChip({
  name,
  avatarUrl,
  score,
  isHost,
  isBoss,
  isMe,
  size = 'md',
}: PlayerChipProps) {
  return (
    <div
      className={`
        flex items-center gap-3 px-3 py-2
        border-4 border-black
        ${isMe ? 'bg-cyan shadow-[4px_4px_0px_#000]' : 'bg-white shadow-[4px_4px_0px_#000]'}
        ${size === 'sm' ? 'text-sm' : 'text-base font-bold'}
      `}
    >
      <Avatar url={avatarUrl} name={name} size={size === 'sm' ? 32 : 40} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold truncate text-black">{name}</span>
          {isHost && (
            <span className="text-xs bg-yellow px-1 border-2 border-black uppercase tracking-wide">
              Host
            </span>
          )}
          {isBoss && (
            <span className="text-xs bg-game-red text-white px-1 border-2 border-black uppercase tracking-wide">
              Boss
            </span>
          )}
        </div>
        <div className="text-black font-mono text-sm tabular-nums">{score} pts</div>
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

export function CountdownRing({ seconds, total, size = 80, className = '' }: CountdownRingProps) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const progress = seconds / total
  const dashOffset = circumference * (1 - progress)

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={8} stroke="#000" fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={8}
          stroke={seconds <= 3 ? '#c8102e' : '#003087'}
          fill="none"
          strokeLinecap="square"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transition={{ duration: 1, ease: 'linear' }}
        />
      </svg>
      <span
        className="absolute text-2xl font-display text-black shadow-white tabular-nums"
        style={{ textShadow: '2px 2px 0 #fff, -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff' }}
      >
        {Math.ceil(seconds)}
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`bg-game-card border-4 border-black p-6 max-w-md w-full shadow-[16px_16px_0px_#000] ${className}`}
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
      className={`font-display font-bold uppercase tracking-widest text-3xl text-game-text ${className}`}
    >
      {children}
    </h1>
  )
}

// ─── GameLogo ─────────────────────────────────────────────────────────────────

export function GameLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-baseline gap-1 ${className}`}>
      <span className="font-display font-bold uppercase bg-magenta text-white px-2 py-1 border-4 border-black rotate-[-4deg] text-3xl sm:text-5xl tracking-tight shadow-[4px_4px_0px_#000]">
        NHL
      </span>
      <span className="font-display font-bold uppercase bg-cyan text-black px-2 py-1 border-4 border-black rotate-[3deg] text-3xl sm:text-5xl tracking-tight shadow-[4px_4px_0px_#000] z-10 -ml-2">
        Stats
      </span>
      <span className="font-display font-bold uppercase bg-yellow text-white px-2 py-1 border-4 border-black rotate-[-2deg] text-3xl sm:text-5xl tracking-tight shadow-[4px_4px_0px_#000] -ml-2">
        Master
      </span>
    </div>
  )
}

// ─── Divider ─────────────────────────────────────────────────────────────────

export function GameDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex-1 h-2 bg-black" />
      <div className="w-5 h-5 bg-magenta border-4 border-black rotate-45 shadow-[2px_2px_0px_#000]" />
      <div className="flex-1 h-2 bg-black" />
    </div>
  )
}

// ─── StatLabel ───────────────────────────────────────────────────────────────

export function StatLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-bold uppercase tracking-widest text-black bg-cyan border-2 border-black px-1 shadow-[2px_2px_0_#000] transform -rotate-1 inline-block">
      {children}
    </span>
  )
}
