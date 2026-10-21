import { Pause } from 'lucide-react'

export function GamePausedBanner() {
  return (
    <div role="status" className="on-ice relative z-[2] flex items-center gap-3 border-l-[5px] border-ink px-5 py-4">
      <Pause size={22} strokeWidth={2.4} aria-hidden="true" />
      <div>
        <p className="font-display m-0 text-2xl leading-none font-extrabold uppercase">Game paused</p>
        <p className="mt-1 mb-0 text-sm text-ink-2">Waiting for the host or boss to resume.</p>
      </div>
    </div>
  )
}
