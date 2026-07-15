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
}

interface DragState {
  startX: number
  curX: number
}

/**
 * Per-gesture metadata kept in a ref (mutated without re-rendering):
 * - `previousRange`: the committed range at pointer-down, restored verbatim if
 *   the gesture is cancelled (OS interruption, context menu) so an interrupted
 *   drag never leaves a mid-drag range in the store.
 * - `exceeded`: latches true once the drag passes MIN_DRAG_PX and stays true for
 *   the rest of the gesture, so dragging back toward the start keeps committing
 *   the drawn band (the other panels track the visible selection continuously)
 *   and the release still commits a range rather than click-clearing.
 */
interface DragMeta {
  previousRange: [Date, Date] | null
  exceeded: boolean
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
}: BrushProps) {
  const overlayRef = useRef<SVGRectElement>(null)
  const metaRef = useRef<DragMeta | null>(null)
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
    // Snapshot the pre-drag range so an interrupted gesture can revert to it.
    metaRef.current = { previousRange: brushRange, exceeded: false }
    setDrag({ startX: px, curX: px })
    e.preventDefault()
  }

  function handlePointerMove(e: ReactPointerEvent<SVGRectElement>): void {
    if (drag === null) return
    const px = localX(e.clientX)
    setDrag({ startX: drag.startX, curX: px })
    const meta = metaRef.current
    if (meta !== null) {
      // Latch once past the threshold: a stationary press never wipes an
      // existing selection, but after a real drag begins we keep committing the
      // live band even if the pointer wanders back within MIN_DRAG_PX of start.
      if (Math.abs(px - drag.startX) >= MIN_DRAG_PX) {
        meta.exceeded = true
      }
      if (meta.exceeded) {
        onBrush(pixelRangeToTimeRange(xScale, drag.startX, px))
      }
    }
    e.preventDefault()
  }

  function endDrag(e: ReactPointerEvent<SVGRectElement>): void {
    if (drag === null) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    const px = localX(e.clientX)
    const exceeded = metaRef.current?.exceeded ?? false
    // A gesture that never passed the threshold is a click-to-clear.
    const next = exceeded ? pixelRangeToTimeRange(xScale, drag.startX, px) : null
    metaRef.current = null
    setDrag(null)
    onBrush(next)
  }

  function cancelDrag(): void {
    // Revert to the pre-drag range: a cancelled gesture must not leave the last
    // mid-drag range committed in the store.
    const meta = metaRef.current
    metaRef.current = null
    setDrag(null)
    if (meta !== null) {
      onBrush(meta.previousRange)
    }
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
