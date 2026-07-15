import type { ScaleTime } from 'd3'

/** A drag shorter than this (px) is treated as a click-to-clear, not a range. */
export const MIN_DRAG_PX = 4

function clampDate(d: Date, lo: Date, hi: Date): Date {
  const t = d.getTime()
  if (t < lo.getTime()) return lo
  if (t > hi.getTime()) return hi
  return d
}

/**
 * Map an ordered pair of plot-space pixel x's to a clamped, start<end time
 * range via the chart's x scale. Pure (pixels in, dates out) so it is unit
 * testable independently of the DOM. Callers pass any two pixel values; this
 * orders them and clamps the inverted dates to the scale's domain.
 */
export function pixelRangeToTimeRange(
  xScale: ScaleTime<number, number>,
  aPx: number,
  bPx: number,
): [Date, Date] {
  const loPx = Math.min(aPx, bPx)
  const hiPx = Math.max(aPx, bPx)
  const [d0, d1] = xScale.domain()
  const t0 = clampDate(xScale.invert(loPx), d0, d1)
  const t1 = clampDate(xScale.invert(hiPx), d0, d1)
  return [t0, t1]
}
