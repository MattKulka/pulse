import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export interface TooltipProps {
  /** Anchor position in pixels, relative to the tooltip's positioned container. */
  x: number
  y: number
  /**
   * Width of the positioned container (px). Used to clamp the tooltip so it
   * never overflows the panel's left/right edge — important for extreme-
   * longitude quakes near the map edges / date line.
   */
  containerWidth: number
  /**
   * Place the tooltip above (default) or below its anchor. Callers flip to
   * 'below' when the anchor sits near the top edge so the card stays on-screen.
   */
  placement?: 'above' | 'below'
  children: ReactNode
}

const GAP = 10
const EDGE = 8 // keep at least this many px between the card and the panel edge

/**
 * A lightweight, absolutely-positioned HTML tooltip. Rendered inside a
 * `position: relative` chart container and centered horizontally over its
 * anchor (x, y), but clamped to the container bounds so it stays fully on-screen
 * at both the far-east and far-west map edges. Purely presentational and
 * non-interactive (pointerEvents:none) so it never intercepts hover/click on the
 * marks beneath it. Legible in light and dark via surface/border/text tokens.
 */
export function Tooltip({
  x,
  y,
  containerWidth,
  placement = 'above',
  children,
}: TooltipProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [halfWidth, setHalfWidth] = useState(0)

  // Measure the rendered card so the horizontal clamp uses its true width
  // (place names vary in length). useLayoutEffect corrects before paint.
  useLayoutEffect(() => {
    const el = cardRef.current
    if (el !== null) {
      setHalfWidth(el.offsetWidth / 2)
    }
  }, [children, containerWidth])

  const translateY =
    placement === 'above' ? `calc(-100% - ${GAP}px)` : `${GAP}px`

  // Centered on the anchor, then clamped so [x - halfWidth, x + halfWidth] stays
  // within [EDGE, containerWidth - EDGE]. If the container is narrower than the
  // card, fall back to centering (min > max) rather than producing a NaN.
  const lo = halfWidth + EDGE
  const hi = containerWidth - halfWidth - EDGE
  const clampedX = hi >= lo ? Math.max(lo, Math.min(hi, x)) : x

  return (
    <div
      ref={cardRef}
      role="tooltip"
      className="pointer-events-none absolute z-20 w-max max-w-[16rem] break-words rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs leading-snug text-content shadow-md"
      style={{
        left: clampedX,
        top: y,
        transform: `translate(-50%, ${translateY})`,
      }}
    >
      {children}
    </div>
  )
}
