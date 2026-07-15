import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { geoEquirectangular, geoGraticule, geoPath } from 'd3'
import { useFilteredQuakes } from '../../hooks/useFilteredQuakes'
import { useQuakes } from '../../hooks/useQuakes'
import { useResizeObserver } from '../../hooks/useResizeObserver'
import { useLandFeature } from '../../hooks/useLandFeature'
import { useUiStore } from '../../store/uiStore'
import { magRadius, geoPointRadiusScale, magColorVar, MAG_BUCKETS } from '../../lib/scales'
import { emptyReason } from '../../lib/emptyState'
import { geoTableRows } from '../../lib/tableRows'
import { prefersReducedMotion } from '../../lib/motion'
import { formatMag, formatDepth, formatLocalTime, formatDateTime } from '../../lib/format'
import { Tooltip } from './primitives/Tooltip'
import { Legend } from './Legend'
import { EpicenterList } from '../EpicenterList'
import { Skeleton } from '../states/Skeleton'
import { EmptyState } from '../states/EmptyState'
import {
  DataTable,
  DataTableDisclosure,
  type DataTableColumn,
} from '../a11y/DataTable'
import type { Quake } from '../../types/quake'

const ALL_BUCKET_KEYS = MAG_BUCKETS.map((b) => b.key)

type ViewMode = 'map' | 'list'

interface ViewSegment {
  mode: ViewMode
  label: string
  testId: string
}

// Map is the DEFAULT view (the `.geo-point` e2e checks depend on it) and is
// listed first in the segmented control.
const VIEW_SEGMENTS: readonly ViewSegment[] = [
  { mode: 'map', label: 'Map', testId: 'view-toggle-map' },
  { mode: 'list', label: 'List', testId: 'view-toggle-list' },
]

// Cap the accessible event table so it stays scannable on a large feed; the
// caption notes the true total when rows are trimmed.
const GEO_TABLE_LIMIT = 50

// Accessible data-table fallback: one row per (filtered) event.
const TABLE_COLUMNS: DataTableColumn<Quake>[] = [
  { key: 'place', header: 'Place', cell: (q) => q.place },
  { key: 'mag', header: 'Magnitude', align: 'right', cell: (q) => formatMag(q.mag) },
  {
    key: 'depth',
    header: 'Depth (km)',
    align: 'right',
    // Header already carries the unit, so show the bare number here.
    cell: (q) => (Number.isFinite(q.depth) ? q.depth.toFixed(1) : '—'),
  },
  { key: 'time', header: 'Time', cell: (q) => formatDateTime(q.time) },
]

const MARGIN = { top: 8, right: 8, bottom: 8, left: 8 }
// Equirectangular is a 2:1 projection; matching the box keeps letterboxing
// minimal while the projection itself stays undistorted (fitSize preserves it).
const ASPECT = 2
const MIN_INNER_HEIGHT = 200
const MAX_INNER_HEIGHT = 460

interface Point {
  id: string
  cx: number
  cy: number
  quake: Quake
}

// Only "significant" quakes emit sonar ripples — the rest still glow. Everything
// at or above this magnitude ripples, capped to the strongest RIPPLE_CAP so a
// busy feed never spawns hundreds of looping animations.
const RIPPLE_MIN_MAG = 3
const RIPPLE_CAP = 40

// Deterministic 0..1 offset from a stable id, used to desync ripple loops so the
// field twinkles instead of strobing in unison. Pure hash → same every render.
function idOffset(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i += 1) {
    h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0
  }
  return (Math.abs(h) % 1000) / 1000
}

// Soft-glow halo opacity for a point: brighter halo for stronger quakes so the
// glow reads as intensity (size + color already encode magnitude too).
function glowOpacity(mag: number): number {
  if (!Number.isFinite(mag)) {
    return 0.18
  }
  const t = Math.max(0, Math.min(1, (mag - 1) / 6))
  return 0.16 + t * 0.34
}

// Per-ring CSS custom-property style. Cast keeps the custom props type-safe
// without `any`; React passes `--*` values straight through to the DOM.
interface RippleVars extends CSSProperties {
  '--ripple-scale': number
  '--ripple-opacity': number
  '--ripple-dur': string
  '--ripple-delay': string
}

export function GeoScatter() {
  const quakes = useFilteredQuakes()
  const { isLoading, data } = useQuakes()
  const land = useLandFeature()
  const [ref, { width }] = useResizeObserver<HTMLDivElement>()

  const hiddenSeries = useUiStore((s) => s.hiddenSeries)
  const brushRange = useUiStore((s) => s.brushRange)
  const hoveredQuakeId = useUiStore((s) => s.hoveredQuakeId)
  const setHoveredQuakeId = useUiStore((s) => s.setHoveredQuakeId)
  const pinnedQuakeId = useUiStore((s) => s.pinnedQuakeId)
  const setPinnedQuakeId = useUiStore((s) => s.setPinnedQuakeId)

  // Panel-local view mode: the segmented control switches the panel body between
  // the map SVG and the interactive list. Default = map so the geo e2e checks
  // (which assert `.geo-point` count > 0) keep passing.
  const [viewMode, setViewMode] = useState<ViewMode>('map')

  // Unique per-instance clip id so a second mount can't collide on a hardcoded
  // id (which would make both instances share/steal one <clipPath>). Same for
  // the shared glow filter referenced by the halo group.
  const clipId = useId()
  const glowId = useId()

  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right)
  const innerHeight = Math.max(
    MIN_INNER_HEIGHT,
    Math.min(MAX_INNER_HEIGHT, innerWidth / ASPECT),
  )
  const height = innerHeight + MARGIN.top + MARGIN.bottom

  // Point radii scale down with the map so circles stay legible (not overlapping
  // blobs) on a small mobile map while remaining full-size on desktop. Computed
  // once here and applied to every circle, hover ring and pin ring so they all
  // track the same size.
  const radiusScale = geoPointRadiusScale(innerWidth)
  const radiusOf = (mag: number): number => magRadius(mag) * radiusScale

  const landFeature = land.data

  // Projection fitted to the land feature (d3 = math only; React renders DOM).
  const projection = useMemo(() => {
    if (innerWidth <= 0 || landFeature === undefined) {
      return null
    }
    return geoEquirectangular().fitSize(
      [innerWidth, innerHeight],
      landFeature,
    )
  }, [innerWidth, innerHeight, landFeature])

  const landPath = useMemo(() => {
    if (projection === null || landFeature === undefined) {
      return null
    }
    return geoPath(projection)(landFeature)
  }, [projection, landFeature])

  // Faint lat/long ops-grid behind the points. d3 does the geometry (math only);
  // React renders the single <path>. Recomputed only when the projection changes.
  const graticulePath = useMemo(() => {
    if (projection === null) {
      return null
    }
    return geoPath(projection)(geoGraticule().step([20, 20])())
  }, [projection])

  // Project each quake once; drop points that fall off the projection (null)
  // or produce non-finite pixels. Sort ascending by magnitude so the largest
  // (most significant) circles are painted last and read on top.
  const points = useMemo<Point[]>(() => {
    if (projection === null) {
      return []
    }
    return quakes
      .map((q): Point | null => {
        const xy = projection([q.lng, q.lat])
        if (xy === null) {
          return null
        }
        const [cx, cy] = xy
        if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
          return null
        }
        return { id: q.id, cx, cy, quake: q }
      })
      .filter((p): p is Point => p !== null)
      .sort((a, b) => a.quake.mag - b.quake.mag)
  }, [projection, quakes])

  // Significant quakes that emit sonar ripples: mag ≥ RIPPLE_MIN_MAG, capped to
  // the strongest RIPPLE_CAP. `points` is sorted ascending by magnitude, so the
  // strongest significant events are the tail — slice from the end.
  const ripplePoints = useMemo<Point[]>(() => {
    const significant = points.filter((p) => p.quake.mag >= RIPPLE_MIN_MAG)
    return significant.length > RIPPLE_CAP
      ? significant.slice(significant.length - RIPPLE_CAP)
      : significant
  }, [points])

  const hoveredPoint = useMemo(
    () => points.find((p) => p.id === hoveredQuakeId) ?? null,
    [points, hoveredQuakeId],
  )
  const pinnedPoint = useMemo(
    () => points.find((p) => p.id === pinnedQuakeId) ?? null,
    [points, pinnedQuakeId],
  )

  // Exit animation: when a point disappears (a series is hidden, or the brush
  // narrows), keep a frozen copy briefly so it can fade + scale out via CSS
  // rather than vanishing. Re-shown points fade/scale IN through the existing
  // .geo-point mount animation. Under reduced motion we skip this entirely and
  // let removed points unmount immediately (no motion). Each exiting circle
  // removes itself on animationend, so no timers to manage.
  const prevPointsRef = useRef<Map<string, Point>>(new Map())
  const [exiting, setExiting] = useState<Point[]>([])
  useEffect(() => {
    const prev = prevPointsRef.current
    const currentIds = new Set(points.map((p) => p.id))
    const next = new Map<string, Point>()
    for (const p of points) {
      next.set(p.id, p)
    }
    prevPointsRef.current = next

    if (prefersReducedMotion()) {
      // Drop any lingering exit copies immediately when motion is disabled.
      setExiting((cur) => (cur.length === 0 ? cur : []))
      return
    }

    const removed: Point[] = []
    prev.forEach((p, id) => {
      if (!currentIds.has(id)) {
        removed.push(p)
      }
    })
    // Keep only exit copies that have NOT re-entered, then append newly removed.
    setExiting((cur) => {
      const stillGone = cur.filter((e) => !currentIds.has(e.id))
      if (removed.length === 0 && stillGone.length === cur.length) {
        return cur
      }
      return [...stillGone, ...removed]
    })
  }, [points])

  const label = `World map of ${quakes.length} earthquakes, sized and colored by magnitude.`

  // Ripples are motion; under reduced-motion we render none (the glow + points
  // still fully convey magnitude). Read at render like the exit-animation effect.
  const reduceMotion = prefersReducedMotion()

  // Rows for the accessible table fallback: most significant events first, capped.
  // Memoized on `quakes` so hover/pin re-renders (which fire on every pointer
  // move over the map) don't re-copy + re-sort the whole filtered array.
  const tableRows = useMemo(
    () => geoTableRows(quakes, GEO_TABLE_LIMIT),
    [quakes],
  )
  const tableCaption =
    quakes.length > tableRows.length
      ? `Top ${tableRows.length} of ${quakes.length} earthquakes, by magnitude.`
      : `All ${quakes.length} earthquakes, by magnitude.`

  // First load (quakes not yet fetched): a panel-shaped skeleton that reuses the
  // SAME ref + width/aspect sizing as the real map (plus a header row that
  // reserves the title + legend height). Sizing the plot block from the measured
  // width means the panel does not jump taller when data replaces it — the map
  // grows with width up to MAX_INNER_HEIGHT, so a fixed MIN-height skeleton
  // would under-reserve on wider screens.
  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="Loading chart"
        data-testid="chart-skeleton"
        className="panel px-5 py-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-6 w-full max-w-[16rem]" />
        </div>
        <div ref={ref} className="mt-3" style={{ minHeight: MIN_INNER_HEIGHT }}>
          {/* Match the real SVG's rendered height (inner + vertical margins) so
              the plot area doesn't grow/shrink when the map replaces it. */}
          <Skeleton className="w-full" style={{ height }} />
        </div>
      </div>
    )
  }

  // The map consumes visible ∩ brush, so an empty brush window counts as empty.
  // The Legend stays in the header even in the empty state so an all-hidden
  // selection is directly recoverable.
  const reason = emptyReason({
    hasData: (data?.length ?? 0) > 0,
    filteredCount: quakes.length,
    brushRange,
    hiddenSeries,
    allBucketKeys: ALL_BUCKET_KEYS,
  })

  return (
    <div className="panel px-5 py-4">
      {/* Header doubles as the dashboard-wide magnitude color key: the legend
          toggles hide/show each bucket across every panel. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2
          id="panel-geo-title"
          className="panel-title flex items-center gap-2"
        >
          <span aria-hidden="true" className="panel-tick" />
          Global epicenters
        </h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {/* Map / List segmented control. Active segment glows in the accent
              cyan; both are real buttons (aria-pressed, keyboard-focusable). */}
          <div
            role="group"
            aria-label="Epicenter view"
            className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface p-0.5 font-mono text-[0.6875rem] uppercase tracking-wider"
          >
            {VIEW_SEGMENTS.map((seg) => {
              const active = viewMode === seg.mode
              return (
                <button
                  key={seg.mode}
                  type="button"
                  data-testid={seg.testId}
                  aria-pressed={active}
                  onClick={() => setViewMode(seg.mode)}
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated ${
                    active
                      ? 'bg-surface-elevated text-accent shadow-[0_0_10px_-2px_var(--accent)]'
                      : 'text-content-muted hover:text-content'
                  }`}
                >
                  {seg.label}
                </button>
              )
            })}
          </div>
          {/* Legend stays visible in both modes — it's the shared magnitude
              color key + series toggle. */}
          <Legend />
        </div>
      </div>
      <div
        ref={ref}
        className="relative mt-3"
        style={{ minHeight: MIN_INNER_HEIGHT }}
      >
        {viewMode === 'list' ? (
          // List view: self-contained (reads the same filtered source and its
          // own empty state). Height matched to the map so the panel body
          // doesn't jump when switching modes.
          <EpicenterList maxHeight={height} />
        ) : reason !== null ? (
          <EmptyState
            reason={reason}
            className="min-h-[200px] justify-center"
          />
        ) : land.isError ? (
          <p className="py-16 text-center text-sm text-content-muted">
            Map data unavailable.
          </p>
        ) : innerWidth > 0 ? (
          <svg
            role="img"
            aria-label={label}
            width={width}
            height={height}
            style={{ display: 'block' }}
          >
            <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
              {/* Clip the plotted points/rings to the plot rect so quakes at
                  extreme latitudes (which project beyond the land-fit bbox) or
                  near the edges don't bleed outside the panel. Defined in the
                  same (untransformed) plot space as the clipped group below. */}
              <defs>
                <clipPath id={clipId}>
                  <rect x={0} y={0} width={innerWidth} height={innerHeight} />
                </clipPath>
                {/* One shared blur filter for ALL glow halos (cheaper than a
                    per-circle filter). Widened region so the blur isn't clipped
                    to each halo's tight bbox. Halos keep their own fill, so this
                    stays color-agnostic. */}
                <filter
                  id={glowId}
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                  colorInterpolationFilters="sRGB"
                >
                  <feGaussianBlur stdDeviation={2.4} />
                </filter>
              </defs>
              <g clipPath={`url(#${clipId})`}>
              {/* Faint lat/long ops-grid behind everything. Decorative. */}
              {graticulePath !== null ? (
                <path
                  aria-hidden="true"
                  d={graticulePath}
                  fill="none"
                  stroke="var(--accent)"
                  strokeOpacity={0.1}
                  strokeWidth={0.5}
                  style={{ pointerEvents: 'none' }}
                />
              ) : null}
              {/* Land: very dark fill, thin cyan-tinted glowing coastline so
                  continents read as outlines on the grid. */}
              {landPath !== null ? (
                <path
                  className="geo-land"
                  aria-hidden="true"
                  d={landPath}
                  fill="var(--border)"
                  fillOpacity={0.4}
                  stroke="var(--accent)"
                  strokeOpacity={0.35}
                  strokeWidth={0.6}
                  style={{ pointerEvents: 'none' }}
                />
              ) : null}
              {/* Soft magnitude-colored glow halos, one per point, all sharing a
                  single blur filter. Rendered behind the crisp cores. */}
              <g filter={`url(#${glowId})`} aria-hidden="true">
                {points.map((p) => (
                  <circle
                    key={`glow-${p.id}`}
                    cx={p.cx}
                    cy={p.cy}
                    r={radiusOf(p.quake.mag) * 1.9}
                    fill={magColorVar(p.quake.mag)}
                    fillOpacity={glowOpacity(p.quake.mag)}
                    style={{ pointerEvents: 'none' }}
                  />
                ))}
              </g>
              {/* ★ Sonar ripples: significant quakes emit expanding rings that
                  radiate + fade on a loop, staggered so the field twinkles.
                  Animated via CSS transform:scale (Safari won't animate `r`);
                  pointer-events:none so they never block the real point. Skipped
                  entirely under reduced motion. */}
              {!reduceMotion
                ? ripplePoints.map((p) => {
                    const baseR = radiusOf(p.quake.mag)
                    const t = Math.max(0, Math.min(1, (p.quake.mag - 3) / 4))
                    const maxScale = 3 + t * 3
                    const dur = 2400 + t * 1400
                    const opacity = 0.35 + t * 0.35
                    const color = magColorVar(p.quake.mag)
                    const off = idOffset(p.id)
                    // 2 concentric rings, the 2nd interleaved by half a cycle,
                    // both desynced from other points via the id-derived offset.
                    return [0, 0.5].map((phase) => {
                      const delay = -((off + phase) * dur)
                      const style: RippleVars = {
                        stroke: color,
                        '--ripple-scale': maxScale,
                        '--ripple-opacity': opacity,
                        '--ripple-dur': `${dur}ms`,
                        '--ripple-delay': `${delay}ms`,
                      }
                      return (
                        <circle
                          key={`ripple-${p.id}-${phase}`}
                          className="geo-ripple"
                          aria-hidden="true"
                          cx={p.cx}
                          cy={p.cy}
                          r={baseR}
                          fill="none"
                          strokeWidth={1.5}
                          vectorEffect="non-scaling-stroke"
                          style={style}
                        />
                      )
                    })
                  })
                : null}
              {points.map((p) => {
                const isActive = p.id === hoveredQuakeId || p.id === pinnedQuakeId
                return (
                  <circle
                    key={p.id}
                    className="geo-point"
                    data-quake-id={p.id}
                    cx={p.cx}
                    cy={p.cy}
                    r={radiusOf(p.quake.mag)}
                    fill={magColorVar(p.quake.mag)}
                    fillOpacity={isActive ? 0.92 : 0.62}
                    stroke="var(--surface-elevated)"
                    strokeOpacity={0.9}
                    strokeWidth={1}
                    style={{ cursor: 'pointer' }}
                    onPointerEnter={() => setHoveredQuakeId(p.id)}
                    onPointerMove={() => {
                      // No-op when already hovering this circle: avoid a store
                      // write (and re-render) on every pointer move.
                      if (useUiStore.getState().hoveredQuakeId !== p.id) {
                        setHoveredQuakeId(p.id)
                      }
                    }}
                    onPointerLeave={() => {
                      // Only clear if this circle is still the hovered one:
                      // moving onto an adjacent circle sets the new id first,
                      // and its leave event must not then wipe that.
                      if (useUiStore.getState().hoveredQuakeId === p.id) {
                        setHoveredQuakeId(null)
                      }
                    }}
                    onClick={() => setPinnedQuakeId(p.id)}
                  />
                )
              })}
              {/* Exiting points: frozen copies of just-removed circles animating
                  out. Non-interactive; each removes itself on animationend. */}
              {exiting.map((p) => (
                <circle
                  key={`exit-${p.id}`}
                  className="geo-point-exit"
                  cx={p.cx}
                  cy={p.cy}
                  r={radiusOf(p.quake.mag)}
                  fill={magColorVar(p.quake.mag)}
                  fillOpacity={0.62}
                  stroke="var(--surface-elevated)"
                  strokeOpacity={0.9}
                  strokeWidth={1}
                  onAnimationEnd={() =>
                    setExiting((cur) => cur.filter((e) => e.id !== p.id))
                  }
                />
              ))}
              {/* Pinned marker: a persistent ring that stays after the pointer
                  leaves (distinct dashed ring). Rendered under the hover ring. */}
              {pinnedPoint !== null ? (
                <circle
                  className="geo-pinned-ring"
                  data-testid="geo-pinned-ring"
                  cx={pinnedPoint.cx}
                  cy={pinnedPoint.cy}
                  r={radiusOf(pinnedPoint.quake.mag) + 5}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  strokeDasharray="3 2"
                  style={{ pointerEvents: 'none' }}
                />
              ) : null}
              {/* Hover ring: a bright cyan glow ring around the hovered circle
                  (ring + enlarged + raised opacity — non-color signals). */}
              {hoveredPoint !== null ? (
                <circle
                  className="geo-hover-ring"
                  data-testid="geo-hover-ring"
                  cx={hoveredPoint.cx}
                  cy={hoveredPoint.cy}
                  r={radiusOf(hoveredPoint.quake.mag) + 3}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  style={{ pointerEvents: 'none' }}
                />
              ) : null}
              </g>
            </g>
            {landFeature === undefined ? (
              <text
                x={width / 2}
                y={height / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--text-muted)"
                fontSize={13}
              >
                Loading world map…
              </text>
            ) : null}
          </svg>
        ) : null}
        {/* Shared tooltip: a single card for the hovered quake, anchored near
            its projected point. Flips below the point when it is near the top
            edge so it stays on-screen. Map mode only — in list mode a hovered
            row highlights inline, and the map coords aren't on screen. */}
        {viewMode === 'map' && hoveredPoint !== null ? (
          <Tooltip
            x={MARGIN.left + hoveredPoint.cx}
            y={MARGIN.top + hoveredPoint.cy}
            containerWidth={width}
            placement={hoveredPoint.cy < 64 ? 'below' : 'above'}
          >
            <div className="font-medium text-content">
              {hoveredPoint.quake.place}
            </div>
            <div className="mt-0.5 font-mono tabular-nums text-content-muted">
              {formatMag(hoveredPoint.quake.mag)} ·{' '}
              {formatDepth(hoveredPoint.quake.depth)} ·{' '}
              {formatLocalTime(hoveredPoint.quake.time)}
            </div>
          </Tooltip>
        ) : null}
      </div>
      {tableRows.length > 0 ? (
        <DataTableDisclosure summary="View data table" testId="geo-data-table">
          <DataTable
            caption={tableCaption}
            columns={TABLE_COLUMNS}
            rows={tableRows}
            rowKey={(q) => q.id}
          />
        </DataTableDisclosure>
      ) : null}
    </div>
  )
}
