'use client'

export type DockItemData = {
  icon: React.ReactNode
  label: React.ReactNode
  onClick: () => void
  className?: string
}

export type DockProps = {
  items: DockItemData[]
  className?: string
}

export default function Dock({ items, className = '' }: DockProps) {
  if (items.length === 0) return null

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border-[3px] border-white bg-c-ink p-1.5 shadow-[0_6px_0_rgba(0,0,0,0.35)] sm:gap-2 sm:p-2 ${className}`}
      role="toolbar"
      aria-label="Controls"
    >
      {items.map((item, index) => (
        <button
          key={index}
          type="button"
          onClick={item.onClick}
          className={`btn-puffy flex items-center gap-2 rounded-full px-3.5 py-2.5 font-display text-sm leading-none whitespace-nowrap shadow-[0_3px_0_#0a1535] sm:gap-2.5 sm:px-5 sm:py-3 sm:text-sm ${item.className ?? 'bg-white text-c-ink'}`}
        >
          <span className="flex shrink-0 items-center justify-center [&>svg]:size-5">
            {item.icon}
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  )
}
