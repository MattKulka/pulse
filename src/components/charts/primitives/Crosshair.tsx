export interface CrosshairProps {
  /** Cursor x in plot-space pixels (inside the chart margins). */
  x: number
  /** Plot pixel extents (inside the chart margins). */
  innerWidth: number
  innerHeight: number
  /** Short label for the hovered bin, e.g. `13:00–13:30 · 4 events`. */
  label: string
}

const FONT_SIZE = 11
const PAD_X = 6
const PAD_Y = 4
const CHAR_W = 6.1 // rough advance width at FONT_SIZE for the label background
const OFFSET = 8 // gap between the guide line and the label box

/**
 * A subtle, React-owned SVG crosshair for the time-series plot: a vertical
 * guide line at the cursor plus a small label box (bin time-range + count).
 * Purely presentational and non-interactive (pointerEvents:none) so the Brush
 * overlay beneath it keeps receiving drag input — hover shows this, drag brushes.
 * Meant to render inside the chart's margin-translated <g>, above the bars.
 */
export function Crosshair({ x, innerWidth, innerHeight, label }: CrosshairProps) {
  const boxW = label.length * CHAR_W + PAD_X * 2
  const boxH = FONT_SIZE + PAD_Y * 2
  // Prefer the label to the right of the line; flip left near the right edge.
  const flipLeft = x + OFFSET + boxW > innerWidth
  const boxX = flipLeft ? x - OFFSET - boxW : x + OFFSET
  const textX = boxX + PAD_X
  const boxY = 0

  return (
    <g style={{ pointerEvents: 'none' }} data-testid="crosshair">
      <line
        x1={x}
        x2={x}
        y1={0}
        y2={innerHeight}
        stroke="var(--text-muted)"
        strokeOpacity={0.55}
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <g>
        <rect
          x={boxX}
          y={boxY}
          width={boxW}
          height={boxH}
          rx={4}
          fill="var(--surface-elevated)"
          stroke="var(--border)"
          strokeWidth={1}
        />
        <text
          x={textX}
          y={boxY + boxH / 2}
          dominantBaseline="central"
          fontSize={FONT_SIZE}
          fill="var(--text)"
        >
          {label}
        </text>
      </g>
    </g>
  )
}
