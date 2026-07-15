import type { CSSProperties } from 'react'

interface SkeletonProps {
  /** Extra classes (typically Tailwind sizing, e.g. `h-4 w-24`). */
  className?: string
  /** Inline styles for dimensions the utility classes don't cover. */
  style?: CSSProperties
}

/**
 * A single shimmer block. The pulse is gated behind `motion-safe:` so under
 * `prefers-reduced-motion: reduce` it renders as a plain static muted block
 * (no animation) — matching the app's reduced-motion contract. Purely
 * decorative: hidden from assistive tech (loading is announced once at the
 * container level, not per block).
 */
export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div
      data-testid="skeleton"
      aria-hidden="true"
      className={`rounded-md bg-border motion-safe:animate-pulse ${className}`}
      style={style}
    />
  )
}

/**
 * Loading placeholder shaped like a KPI tile (accent bar + label line + value
 * line) so the first-load layout doesn't jump when real numbers arrive.
 */
export function KpiTileSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading metric"
      data-testid="kpi-skeleton"
      className="relative overflow-hidden rounded-xl border border-border bg-surface-elevated px-5 py-4 shadow-sm"
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-border" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-8 w-16" />
    </div>
  )
}

interface ChartSkeletonProps {
  /** Height of the plot-area block in px (match the panel it stands in for). */
  height?: number
}

/**
 * Loading placeholder shaped like a chart panel (title line + a plot-area
 * block). `height` should match the real panel so first load doesn't reflow.
 */
export function ChartSkeleton({ height = 260 }: ChartSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading chart"
      data-testid="chart-skeleton"
      className="rounded-xl border border-border bg-surface-elevated px-5 py-4 shadow-sm"
    >
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-3 w-full" style={{ height }} />
    </div>
  )
}
