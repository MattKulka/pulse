import type { ReactNode } from 'react'

export interface TooltipProps {
  /** Anchor position in pixels, relative to the tooltip's positioned container. */
  x: number
  y: number
  /**
   * Place the tooltip above (default) or below its anchor. Callers flip to
   * 'below' when the anchor sits near the top edge so the card stays on-screen.
   */
  placement?: 'above' | 'below'
  children: ReactNode
}

const GAP = 10

/**
 * A lightweight, absolutely-positioned HTML tooltip. Rendered inside a
 * `position: relative` chart container and centered horizontally over its
 * anchor (x, y). Purely presentational and non-interactive (pointerEvents:none)
 * so it never intercepts hover/click on the marks beneath it. Legible in light
 * and dark via surface/border/text tokens.
 */
export function Tooltip({ x, y, placement = 'above', children }: TooltipProps) {
  const translateY =
    placement === 'above' ? `calc(-100% - ${GAP}px)` : `${GAP}px`
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 max-w-[16rem] rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs leading-snug text-content shadow-md"
      style={{
        left: x,
        top: y,
        transform: `translate(-50%, ${translateY})`,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </div>
  )
}
