import { useEffect, useState } from 'react'
import { useQuakes } from '../../hooks/useQuakes'
import { formatRelativeTime } from '../../lib/format'

// How often the relative-age label re-computes on its own. The query itself
// re-renders this component whenever it (re)fetches, so this interval only needs
// to keep the "Ns ago / Nm ago" text creeping forward between fetches.
const TICK_MS = 15_000

type FreshnessState = 'loading' | 'error' | 'updating' | 'fresh'

/**
 * Header freshness affordance. Surfaces the existing 60s auto-refresh: shows how
 * long ago the feed last succeeded (ticking every ~15s), a subtle "updating…"
 * while a refetch is in flight, and a one-shot flash on each fresh success. It
 * also folds in the old static "Live" dot. Reduced motion: the flash/pulse are
 * gated behind `motion-safe:` so the dot stays static. The relative text is
 * announced politely via `aria-live` but kept visually unobtrusive.
 */
export function StaleIndicator() {
  const { dataUpdatedAt, isFetching, isError } = useQuakes()

  // A ticking "now" so the relative age advances between fetches. Re-synced
  // whenever a fresh fetch lands so "just now" is accurate immediately after.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    setNow(Date.now())
  }, [dataUpdatedAt])

  const hasUpdate = dataUpdatedAt > 0
  const relative = hasUpdate ? formatRelativeTime(now - dataUpdatedAt) : null

  // Order matters: an in-flight fetch is reported as `updating` BEFORE `error`,
  // so a retry that follows a prior failure (isError && isFetching) reads
  // "Updating…" rather than "Update failed". The error state is reserved for the
  // settled-failed case (a failure with no fetch currently in flight).
  const state: FreshnessState = !hasUpdate && isFetching
    ? 'loading'
    : isFetching
      ? 'updating'
      : isError
        ? 'error'
        : 'fresh'

  // Fresh/LIVE reads in the reserved accent cyan with a glow; in-flight fetches
  // use the secondary accent; a settled failure uses the warm orange ramp stop
  // (--c-5) which stays a clear "warning" hue in both themes.
  const dotColor =
    state === 'error'
      ? 'bg-chart-5 shadow-[0_0_8px_var(--c-5)]'
      : state === 'updating' || state === 'loading'
        ? 'bg-accent-2 shadow-[0_0_8px_var(--accent-2)]'
        : 'bg-accent shadow-[0_0_10px_var(--accent)]'

  // Flash re-triggers by remounting the dot on each new dataUpdatedAt; the
  // ambient pulse marks an in-flight refetch. Both are motion-safe only.
  const dotMotion =
    state === 'updating' || state === 'loading'
      ? 'motion-safe:animate-[stale-pulse_1.2s_ease-in-out_infinite]'
      : 'motion-safe:animate-[stale-flash_900ms_ease-out]'

  const text =
    state === 'loading'
      ? 'Loading…'
      : state === 'error'
        ? relative
          ? `Update failed · ${relative}`
          : 'Update failed'
        : state === 'updating'
          ? 'Updating…'
          : relative
            ? `Updated ${relative}`
            : 'Live'

  return (
    <span
      data-testid="freshness-indicator"
      data-state={state}
      className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-content-muted"
    >
      <span
        // Remount on each fresh update so the flash keyframe replays.
        key={state === 'fresh' ? dataUpdatedAt : state}
        aria-hidden="true"
        className={`h-2 w-2 rounded-full ${dotColor} ${dotMotion}`}
      />
      <span aria-live="polite">{text}</span>
    </span>
  )
}
