import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { geoEquirectangular, geoPath } from 'd3'
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
import { Skeleton } from '../states/Skeleton'
import { EmptyState } from '../states/EmptyState'
import {
  DataTable,
  DataTableDisclosure,
  type DataTableColumn,
} from '../a11y/DataTable'
import type { Quake } from '../../types/quake'

const ALL_BUCKET_KEYS = MAG_BUCKETS.map((b) => b.key)

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

  // Unique per-instance clip id so a second mount can't collide on a hardcoded
  // id (which would make both instances share/steal one <clipPath>).
  const clipId = useId()

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

  // Rows for the accessible table fallback: most significant events first, capped.
  const tableRows = geoTableRows(quakes, GEO_TABLE_LIMIT)
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
        className="rounded-xl border border-border bg-surface-elevated px-5 py-4 shadow-sm"
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
    <div className="rounded-xl border border-border bg-surface-elevated px-5 py-4 shadow-sm">
      {/* Header doubles as the dashboard-wide magnitude color key: the legend
          toggles hide/show each bucket across every panel. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2
          id="panel-geo-title"
          className="text-sm font-medium text-content-muted"
        >
          Global epicenters
        </h2>
        <Legend />
      </div>
      <div
        ref={ref}
        className="relative mt-3"
        style={{ minHeight: MIN_INNER_HEIGHT }}
      >
        {reason !== null ? (
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
              </defs>
              {landPath !== null ? (
                <path
                  d={landPath}
                  fill="var(--border)"
                  fillOpacity={0.55}
                  stroke="var(--text-muted)"
                  strokeOpacity={0.25}
                  strokeWidth={0.5}
                />
              ) : null}
              <g clipPath={`url(#${clipId})`}>
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
                  data-testid="geo-pinned-ring"
                  cx={pinnedPoint.cx}
                  cy={pinnedPoint.cy}
                  r={radiusOf(pinnedPoint.quake.mag) + 5}
                  fill="none"
                  stroke="var(--text)"
                  strokeWidth={2}
                  strokeDasharray="3 2"
                  style={{ pointerEvents: 'none' }}
                />
              ) : null}
              {/* Hover ring: a solid emphasis ring around the hovered circle
                  (ring + enlarged + raised opacity — non-color signals). */}
              {hoveredPoint !== null ? (
                <circle
                  data-testid="geo-hover-ring"
                  cx={hoveredPoint.cx}
                  cy={hoveredPoint.cy}
                  r={radiusOf(hoveredPoint.quake.mag) + 3}
                  fill="none"
                  stroke="var(--text)"
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
            edge so it stays on-screen. */}
        {hoveredPoint !== null ? (
          <Tooltip
            x={MARGIN.left + hoveredPoint.cx}
            y={MARGIN.top + hoveredPoint.cy}
            containerWidth={width}
            placement={hoveredPoint.cy < 64 ? 'below' : 'above'}
          >
            <div className="font-medium text-content">
              {hoveredPoint.quake.place}
            </div>
            <div className="mt-0.5 text-content-muted">
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
