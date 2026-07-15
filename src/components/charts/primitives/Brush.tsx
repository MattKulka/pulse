import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { ScaleTime } from 'd3'
import { MIN_DRAG_PX, pixelRangeToTimeRange } from '../../../lib/brush'

export interface BrushProps {
  /** x scale (time → pixel) shared with the chart's plot area. */
  xScale: ScaleTime<number, number>
  /** Plot pixel extents (inside the chart margins). */
  innerWidth: number
  innerHeight: number
  /** Current selection from the store (null = no selection). */
  brushRange: [Date, Date] | null
  /** Fired continuously while dragging (and on click-to-clear with null). */
  onBrush: (range: [Date, Date] | null) => void
  /** Fired once when the drag gesture ends, with the final range (or null). */
  onBrushEnd?: (range: [Date, Date] | null) => void
}

interface DragState {
  startX: number
  curX: number
}

/**
 * A reusable, React-owned SVG time brush. Pointer events (mouse + touch) drive
 * a translucent selection rectangle; D3 supplies only the pixel↔time math via
 * the passed x scale. No `d3.brush` / `d3.select` — nothing mutates DOM React
 * owns. Meant to be rendered inside the chart's margin-translated <g>, on top of
 * the bars, spanning the full plot rect.
 */
export function Brush({
  xScale,
  innerWidth,
  innerHeight,
  brushRange,
  onBrush,
  onBrushEnd,
}: BrushProps) {
  const overlayRef = useRef<SVGRectElement>(null)
  const [drag, setDrag] = useState<DragState | null>(null)

  // Pointer clientX → plot-space pixel x. The overlay rect spans plot x 0..W,
  // so its client left corresponds to plot x=0 — robust across margins/zoom
  // without reading the SVG CTM.
  function localX(clientX: number): number {
    const el = overlayRef.current
    if (el === null) return 0
    const box = el.getBoundingClientRect()
    return Math.max(0, Math.min(innerWidth, clientX - box.left))
  }

  function handlePointerDown(e: ReactPointerEvent<SVGRectElement>): void {
    // Only react to the primary button / touch / pen contact.
    if (e.button !== 0) return
    const px = localX(e.clientX)
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ startX: px, curX: px })
    e.preventDefault()
  }

  function handlePointerMove(e: ReactPointerEvent<SVGRectElement>): void {
    if (drag === null) return
    const px = localX(e.clientX)
    setDrag({ startX: drag.startX, curX: px })
    // Live cross-filter: only commit once past the min-drag threshold so a
    // stationary press doesn't wipe an existing selection mid-gesture.
    if (Math.abs(px - drag.startX) >= MIN_DRAG_PX) {
      onBrush(pixelRangeToTimeRange(xScale, drag.startX, px))
    }
    e.preventDefault()
  }

  function endDrag(e: ReactPointerEvent<SVGRectElement>): void {
    if (drag === null) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    const px = localX(e.clientX)
    const isClick = Math.abs(px - drag.startX) < MIN_DRAG_PX
    const next = isClick
      ? null
      : pixelRangeToTimeRange(xScale, drag.startX, px)
    setDrag(null)
    onBrush(next)
    onBrushEnd?.(next)
  }

  function cancelDrag(): void {
    setDrag(null)
  }

  // Resolve the pixel span to render: the live drag while active, otherwise the
  // committed store range projected back through the scale.
  let selection: { x0: number; x1: number } | null = null
  if (drag !== null) {
    selection = {
      x0: Math.min(drag.startX, drag.curX),
      x1: Math.max(drag.startX, drag.curX),
    }
  } else if (brushRange !== null) {
    const a = xScale(brushRange[0])
    const b = xScale(brushRange[1])
    selection = {
      x0: Math.max(0, Math.min(innerWidth, Math.min(a, b))),
      x1: Math.max(0, Math.min(innerWidth, Math.max(a, b))),
    }
  }

  return (
    <g aria-label="Drag across the chart to select a time range">
      {/* Transparent capture surface over the whole plot. pointerEvents:all so
          the fully-transparent fill still receives mouse/touch; touchAction:none
          stops the page from scrolling during a touch-drag. */}
      <rect
        ref={overlayRef}
        x={0}
        y={0}
        width={innerWidth}
        height={innerHeight}
        fill="transparent"
        data-testid="brush-overlay"
        style={{ cursor: 'crosshair', pointerEvents: 'all', touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={cancelDrag}
      />
      {selection !== null && selection.x1 - selection.x0 >= 1 ? (
        <g style={{ pointerEvents: 'none' }} data-testid="brush-selection">
          {/* Translucent selection band. */}
          <rect
            x={selection.x0}
            y={0}
            width={selection.x1 - selection.x0}
            height={innerHeight}
            fill="var(--c-1)"
            fillOpacity={0.14}
            stroke="var(--c-1)"
            strokeOpacity={0.55}
            strokeWidth={1}
          />
          {/* Subtle edge handles at each boundary. */}
          {[selection.x0, selection.x1].map((hx, i) => (
            <rect
              key={i}
              x={hx - 1}
              y={0}
              width={2}
              height={innerHeight}
              fill="var(--c-1)"
              fillOpacity={0.9}
            />
          ))}
        </g>
      ) : null}
    </g>
  )
}
