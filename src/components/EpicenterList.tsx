import { useEffect, useMemo, useState } from 'react'
import { useFilteredQuakes } from '../hooks/useFilteredQuakes'
import { useQuakes } from '../hooks/useQuakes'
import { useUiStore } from '../store/uiStore'
import { magColorVar, MAG_BUCKETS } from '../lib/scales'
import { emptyReason } from '../lib/emptyState'
import { sortQuakes, type QuakeSortMode } from '../lib/sortQuakes'
import {
  formatMag,
  formatDepth,
  formatLatLng,
  formatLocalTime,
  formatRelativeTime,
} from '../lib/format'
import { EmptyState } from './states/EmptyState'
import type { Quake } from '../types/quake'

const ALL_BUCKET_KEYS = MAG_BUCKETS.map((b) => b.key)

// Render cap: sorting keeps the most relevant events at the top, so a simple
// slice + "showing N of M" caption stays smooth on a large feed without pulling
// in a virtualization dependency.
const ROW_CAP = 150

// How often the relative-age labels recompute on their own so "12m ago" creeps
// forward between the 60s feed refetches (which already re-render this list).
const TICK_MS = 30_000

interface SortOption {
  mode: QuakeSortMode
  label: string
  testId: string
}

const SORT_OPTIONS: readonly SortOption[] = [
  { mode: 'magnitude', label: 'Magnitude', testId: 'sort-magnitude' },
  { mode: 'recent', label: 'Recent', testId: 'sort-recent' },
]

interface EpicenterListProps {
  /** Max body height (px) — matched to the map so the panel doesn't jump. */
  maxHeight: number
}

/**
 * List view for the "Global epicenters" panel. A scannable, interactive
 * alternative to the map that reads the SAME `useFilteredQuakes()` source, so it
 * cross-filters with the brush + legend exactly like the map. Hovering / focusing
 * a row drives `hoveredQuakeId` and clicking drives `pinnedQuakeId` through the
 * shared store, so the time-series, histogram and DetailCard stay in sync with
 * the map's own hover/pin behavior.
 */
export function EpicenterList({ maxHeight }: EpicenterListProps) {
  const quakes = useFilteredQuakes()
  const feed = useQuakes().data

  const hiddenSeries = useUiStore((s) => s.hiddenSeries)
  const brushRange = useUiStore((s) => s.brushRange)
  const hoveredQuakeId = useUiStore((s) => s.hoveredQuakeId)
  const setHoveredQuakeId = useUiStore((s) => s.setHoveredQuakeId)
  const pinnedQuakeId = useUiStore((s) => s.pinnedQuakeId)
  const setPinnedQuakeId = useUiStore((s) => s.setPinnedQuakeId)

  const [sortMode, setSortMode] = useState<QuakeSortMode>('magnitude')

  // Ticking "now" so relative ages advance between fetches.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(id)
  }, [])

  // Sort then cap. Memoized on the sort inputs so pointer-driven hover/pin
  // re-renders don't re-sort the whole filtered array on every move.
  const sorted = useMemo(
    () => sortQuakes(quakes, sortMode),
    [quakes, sortMode],
  )
  const rows = useMemo(() => sorted.slice(0, ROW_CAP), [sorted])

  const reason = emptyReason({
    hasData: (feed?.length ?? 0) > 0,
    filteredCount: quakes.length,
    brushRange,
    hiddenSeries,
    allBucketKeys: ALL_BUCKET_KEYS,
  })

  return (
    <div className="flex flex-col gap-3">
      {/* Sort control: mono segmented toggle, Magnitude (desc) by default. */}
      <div
        role="group"
        aria-label="Sort earthquakes"
        className="inline-flex items-center gap-0.5 self-start rounded-lg border border-border bg-surface p-0.5 font-mono text-[0.6875rem] uppercase tracking-wider"
      >
        {SORT_OPTIONS.map((opt) => {
          const active = sortMode === opt.mode
          return (
            <button
              key={opt.mode}
              type="button"
              data-testid={opt.testId}
              aria-pressed={active}
              onClick={() => setSortMode(opt.mode)}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated ${
                active
                  ? 'bg-surface-elevated text-accent shadow-[0_0_10px_-2px_var(--accent)]'
                  : 'text-content-muted hover:text-content'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      {reason !== null ? (
        <EmptyState reason={reason} className="min-h-[200px] justify-center" />
      ) : (
        <div
          data-testid="quake-list"
          className="overflow-y-auto overflow-x-hidden"
          style={{ maxHeight }}
        >
          <ul className="flex flex-col gap-1 pr-1">
            {rows.map((q) => (
              <EpicenterRow
                key={q.id}
                quake={q}
                now={now}
                isHovered={q.id === hoveredQuakeId}
                isPinned={q.id === pinnedQuakeId}
                onHover={setHoveredQuakeId}
                onPin={setPinnedQuakeId}
              />
            ))}
          </ul>
          {quakes.length > rows.length ? (
            <p className="mt-2 px-1 font-mono text-[0.6875rem] uppercase tracking-wider text-content-muted">
              Showing {rows.length} of {quakes.length} events
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}

interface EpicenterRowProps {
  quake: Quake
  now: number
  isHovered: boolean
  isPinned: boolean
  onHover: (id: string | null) => void
  onPin: (id: string | null) => void
}

function EpicenterRow({
  quake,
  now,
  isHovered,
  isPinned,
  onHover,
  onPin,
}: EpicenterRowProps) {
  const color = magColorVar(quake.mag)
  const active = isHovered || isPinned

  // Clear hover only if this row is still the hovered one — moving onto an
  // adjacent row sets the new id first, and this leave/blur must not wipe it.
  const clearHover = (): void => {
    if (useUiStore.getState().hoveredQuakeId === quake.id) {
      onHover(null)
    }
  }

  return (
    <li>
      <button
        type="button"
        data-testid="quake-list-row"
        data-quake-id={quake.id}
        aria-current={isPinned ? 'true' : undefined}
        onPointerEnter={() => onHover(quake.id)}
        onPointerLeave={clearHover}
        onFocus={() => onHover(quake.id)}
        onBlur={clearHover}
        onClick={() => onPin(quake.id)}
        className={`relative flex w-full items-center gap-3 overflow-hidden rounded-lg border px-3 py-2.5 text-left motion-safe:transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated ${
          isPinned
            ? 'border-border-accent bg-surface'
            : isHovered
              ? 'border-border-accent bg-surface'
              : 'border-border/60 hover:border-border-accent hover:bg-surface'
        }`}
      >
        {/* Active indicator bar — a non-color signal (presence, not just hue)
            for the hovered/pinned row. Solid for a pin, translucent on hover. */}
        <span
          aria-hidden="true"
          className={`absolute inset-y-1 left-0 w-[3px] rounded-full bg-accent motion-safe:transition-opacity ${
            isPinned ? 'opacity-100' : isHovered ? 'opacity-60' : 'opacity-0'
          }`}
          style={{ boxShadow: active ? '0 0 8px var(--accent)' : undefined }}
        />

        {/* Magnitude chip: plasma bucket color + soft glow + filled dot; the
            number is right there, so color is never the only signal. */}
        <span
          className="inline-flex min-w-[3.75rem] shrink-0 items-center justify-center gap-1.5 rounded-md border px-2 py-1 font-mono text-sm font-semibold tabular-nums"
          style={{
            color,
            borderColor: color,
            boxShadow: `0 0 8px -1px ${color}`,
          }}
        >
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: color, boxShadow: `0 0 5px ${color}` }}
          />
          {formatMag(quake.mag)}
        </span>

        {/* Primary: place (display font, truncates) + a mono sub-line carrying
            depth and coordinates. */}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            className="truncate font-display text-sm font-medium text-content"
            title={quake.place}
          >
            {quake.place}
          </span>
          <span className="truncate font-mono text-xs tabular-nums text-content-muted">
            {formatDepth(quake.depth)}
            <span aria-hidden="true"> · </span>
            {formatLatLng(quake.lat, quake.lng)}
          </span>
        </span>

        {/* Time: relative age (primary) + the wall-clock time (secondary). */}
        <span className="shrink-0 text-right font-mono text-xs tabular-nums">
          <span className="block text-content">
            {formatRelativeTime(now - quake.time.getTime())}
          </span>
          <span className="block text-content-muted">
            {formatLocalTime(quake.time)}
          </span>
        </span>
      </button>
    </li>
  )
}
