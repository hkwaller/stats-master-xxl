/**
 * Real rink geometry, sunk into the ice at 8–12% opacity.
 * Structure you feel rather than read — it sits at z-index 0 behind all chrome.
 *
 * Two blue lines at 31% / 69%, a red centre line, and a centre faceoff circle
 * with its dot. Everything is pure CSS; there are no image assets.
 */
interface RinkBgProps {
  /** Diameter of the centre faceoff circle, in px. 0 hides it. */
  circleSize?: number
  /** Distance from the top of the container to the top of the circle, in px. */
  circleTop?: number
  /** Multiplies every line's alpha, for surfaces that need it even quieter. */
  intensity?: number
  className?: string
}

export function RinkBg({
  circleSize = 560,
  circleTop = 150,
  intensity = 1,
  className = '',
}: RinkBgProps) {
  const blue = (a: number) => `rgba(11,83,201,${(a * intensity).toFixed(3)})`
  const red = (a: number) => `rgba(207,10,44,${(a * intensity).toFixed(3)})`

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {/* Blue lines */}
      <div className="absolute inset-y-0 w-[7px]" style={{ left: '31%', background: blue(0.1) }} />
      <div className="absolute inset-y-0 w-[7px]" style={{ left: '69%', background: blue(0.1) }} />
      {/* Centre line */}
      <div
        className="absolute inset-y-0 w-[7px] -translate-x-1/2"
        style={{ left: '50%', background: red(0.1) }}
      />
      {/* Centre faceoff circle + dot */}
      {circleSize > 0 && (
        <>
          <div
            className="absolute -translate-x-1/2 rounded-full"
            style={{
              left: '50%',
              top: circleTop,
              width: circleSize,
              height: circleSize,
              border: `5px solid ${blue(0.09)}`,
            }}
          />
          <div
            className="absolute size-8 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: '50%',
              top: circleTop + circleSize / 2,
              background: blue(0.12),
            }}
          />
        </>
      )}
    </div>
  )
}

/**
 * A single faceoff circle, for bleeding off the edge of a hero or a final board.
 * Positioned by the caller via `style`.
 */
export function FaceoffCircle({
  size = 560,
  color = 'rgba(11,83,201,0.10)',
  style,
}: {
  size?: number
  color?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute rounded-full"
      style={{ width: size, height: size, border: `6px solid ${color}`, ...style }}
    />
  )
}
