/**
 * The countdown as a tilted round stamp with a cobalt ring. Under 5 seconds the
 * ring and digits turn alarm red and the ring pulses; nothing shakes.
 */
export function ClockStamp({
  seconds,
  total,
  size = 96,
}: {
  seconds: number
  total: number
  size?: number
}) {
  const s = Math.max(0, Math.ceil(seconds))
  const urgent = s < 5
  const r = size / 2 - size * 0.115
  const circumference = 2 * Math.PI * r
  const fraction = total > 0 ? Math.max(0, Math.min(1, seconds / total)) : 0
  const colour = urgent ? 'var(--color-alarm)' : 'var(--color-cobalt)'

  return (
    <div
      role="timer"
      aria-label={`${s} seconds left`}
      className="relative shrink-0"
      style={{ width: size, height: size, transform: 'rotate(6deg)' }}
    >
      <svg
        aria-hidden="true"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}
      >
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 2} fill="#ffffff" stroke="var(--color-ink)" strokeWidth={3} />
        <circle
          className={urgent ? 'timer-urgent' : ''}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colour}
          strokeWidth={size * 0.075}
          strokeLinecap="round"
          strokeDasharray={`${circumference * fraction} ${circumference}`}
          style={{ transition: 'stroke-dasharray 0.4s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-display tabular-nums"
          style={{ fontSize: size * 0.4, lineHeight: 0.9, color: urgent ? 'var(--color-alarm)' : 'var(--color-ink)' }}
        >
          {s}
        </span>
        <span className="font-mono" style={{ fontSize: Math.max(10, size * 0.11), fontWeight: 700 }}>
          SEC
        </span>
      </div>
    </div>
  )
}
