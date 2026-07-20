'use client'

import { motion } from 'framer-motion'

type TileSize = 'lg' | 'md' | 'sm'

interface StatTileProps {
  abbr: string
  value: string | number
  highlight?: boolean
  hidden?: boolean
  size?: TileSize
  className?: string
}

const OUTER_SHELL: Record<TileSize, string> = {
  lg: 'rounded-[10px] p-1 shadow-[0_3px_0_#0a1535] sm:rounded-[12px] sm:p-[5px] sm:shadow-[0_4px_0_#0a1535] md:rounded-[14px] md:p-1.5',
  md: 'rounded-xl p-[5px] shadow-[0_4px_0_#0a1535]',
  sm: 'rounded-[10px] p-1 shadow-[0_3px_0_#0a1535]',
}

const INNER_PANEL: Record<TileSize, string> = {
  lg: 'min-h-[46px] gap-1 rounded-[7px] px-1.5 py-1.5 sm:min-h-[58px] sm:gap-1.5 sm:rounded-lg sm:py-2 md:min-h-[72px] md:gap-2 md:rounded-[9px] md:py-2.5 lg:min-h-[92px] lg:py-3',
  md: 'min-h-[58px] gap-1.5 rounded-lg px-1.5 py-[9px]',
  sm: 'min-h-[46px] gap-1 rounded-[7px] px-1.5 py-1.5',
}

const LABEL_CHIP: Record<TileSize, string> = {
  lg: 'px-1.5 py-px text-[7px] tracking-[0.2em] sm:px-2 sm:py-0.5 sm:text-[8px] md:text-[9px] lg:text-[10px]',
  md: 'px-2 py-0.5 text-[9px] tracking-[0.2em]',
  sm: 'px-1.5 py-px text-[7px] tracking-[0.2em]',
}

const DIGIT: Record<TileSize, string> = {
  lg: 'text-base leading-[0.9] sm:text-xl md:text-[32px] lg:text-[40px]',
  md: 'text-xl leading-[0.9]',
  sm: 'text-base leading-[0.9]',
}

const DIGIT_LONG: Record<TileSize, string> = {
  lg: 'text-[10px] sm:text-xs md:text-xl lg:text-[25px]',
  md: 'text-xs',
  sm: 'text-[10px]',
}

const DIGIT_MEDIUM: Record<TileSize, string> = {
  lg: 'text-sm sm:text-base md:text-2xl lg:text-[31px]',
  md: 'text-base',
  sm: 'text-sm',
}

const HIDDEN_PLACEHOLDER: Record<TileSize, string> = {
  lg: 'mt-0.5 h-3 w-7 rounded-md sm:h-3.5 sm:w-8 md:h-5 md:w-9 lg:h-7 lg:w-11',
  md: 'mt-0.5 h-3.5 w-7 rounded-md',
  sm: 'mt-0.5 h-3 w-7 rounded-md',
}

function digitClass(valueLen: number, size: TileSize): string {
  if (valueLen >= 4) return DIGIT_LONG[size]
  if (valueLen === 3) return DIGIT_MEDIUM[size]
  return DIGIT[size]
}

export function StatTile({
  abbr,
  value,
  highlight = false,
  hidden = false,
  size = 'lg',
  className = '',
}: StatTileProps) {
  const valueLen = String(value).length

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-visible border-2 border-c-ink bg-white ${OUTER_SHELL[size]} ${className}`}
    >
      <div
        className={`relative flex flex-col items-center overflow-hidden border-[1.5px] border-c-ink shadow-[inset_0_2px_0_rgba(255,255,255,0.12),inset_0_-8px_16px_rgba(0,0,0,0.3)] ${
          highlight
            ? 'bg-linear-to-b from-tile-red-top to-tile-red-bot'
            : 'bg-linear-to-b from-tile-blue-top to-tile-blue-bot'
        } ${INNER_PANEL[size]}`}
      >
        <div
          className={`rounded bg-black/35 font-display-alt leading-none ${LABEL_CHIP[size]} ${
            highlight ? 'text-tile-label-red' : 'text-tile-label-blue'
          }`}
        >
          {abbr}
        </div>

        {hidden ? (
          <div className={`bg-white/15 ${HIDDEN_PLACEHOLDER[size]}`} />
        ) : (
          <div
            className={`font-display tabular-nums text-white ${digitClass(valueLen, size)}`}
          >
            {String(value)}
          </div>
        )}
      </div>
    </motion.div>
  )
}
