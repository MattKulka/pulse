import type { ScaleLinear, ScaleTime } from 'd3'

export type AxisScale =
  | ScaleTime<number, number>
  | ScaleLinear<number, number>

interface AxisProps {
  /** A d3 time or linear scale mapping domain values to pixels. */
  scale: AxisScale
  orientation: 'bottom' | 'left'
  /**
   * Perpendicular pixel extent of the plot. When provided, faint gridlines are
   * drawn across the plot at each tick (up for 'bottom', right for 'left').
   */
  gridLength?: number
  /** Tick-count hint passed to d3's `scale.ticks()`. */
  tickCount?: number
  /** Positions the axis group within the parent SVG coordinate space. */
  transform?: string
}

interface Tick {
  /** Pixel position along the axis. */
  pos: number
  label: string
}

/**
 * Compute tick positions + formatted labels from a d3 scale. Branches on the
 * domain type so d3's Date vs. number tick formatters stay correctly typed
 * without resorting to `any` on the scale union.
 */
function computeTicks(scale: AxisScale, count: number): Tick[] {
  const domain = scale.domain()
  if (domain[0] instanceof Date) {
    const timeScale = scale as ScaleTime<number, number>
    const format = timeScale.tickFormat()
    return timeScale
      .ticks(count)
      .map((value) => ({ pos: timeScale(value), label: format(value) }))
  }
  const linearScale = scale as ScaleLinear<number, number>
  const format = linearScale.tickFormat(count)
  return linearScale
    .ticks(count)
    .map((value) => ({ pos: linearScale(value), label: format(value) }))
}

/**
 * Reusable, React-owned SVG axis. D3 supplies the math (tick values, positions,
 * label formatting); all DOM is rendered as JSX so nothing mutates nodes React
 * controls. Colors come from theme CSS variables so the axis stays legible in
 * both light and dark modes.
 */
export function Axis({
  scale,
  orientation,
  gridLength,
  tickCount = 5,
  transform,
}: AxisProps) {
  const ticks = computeTicks(scale, tickCount)
  const [rangeStart, rangeEnd] = scale.range()
  const isBottom = orientation === 'bottom'

  return (
    <g
      transform={transform}
      fill="none"
      fontSize={11}
      style={{ userSelect: 'none' }}
    >
      {/* Domain line. */}
      <line
        x1={isBottom ? rangeStart : 0}
        x2={isBottom ? rangeEnd : 0}
        y1={isBottom ? 0 : rangeStart}
        y2={isBottom ? 0 : rangeEnd}
        stroke="var(--border)"
      />
      {ticks.map((tick) => (
        <g
          key={tick.label + tick.pos}
          transform={
            isBottom
              ? `translate(${tick.pos},0)`
              : `translate(0,${tick.pos})`
          }
        >
          {/* Faint gridline across the plot — purely decorative. */}
          {gridLength !== undefined ? (
            <line
              aria-hidden="true"
              x1={0}
              x2={isBottom ? 0 : gridLength}
              y1={0}
              y2={isBottom ? -gridLength : 0}
              stroke="var(--border)"
              strokeOpacity={0.5}
            />
          ) : null}
          {/* Tick mark. */}
          <line
            x1={0}
            x2={isBottom ? 0 : -6}
            y1={0}
            y2={isBottom ? 6 : 0}
            stroke="var(--border)"
          />
          {/* Tick label. */}
          <text
            x={isBottom ? 0 : -9}
            y={isBottom ? 9 : 0}
            fill="var(--text-muted)"
            textAnchor={isBottom ? 'middle' : 'end'}
            dominantBaseline={isBottom ? 'hanging' : 'central'}
          >
            {tick.label}
          </text>
        </g>
      ))}
    </g>
  )
}
