import { useMemo } from 'react'
import { geoEquirectangular, geoPath } from 'd3'
import { useFilteredQuakes } from '../../hooks/useFilteredQuakes'
import { useResizeObserver } from '../../hooks/useResizeObserver'
import { useLandFeature } from '../../hooks/useLandFeature'
import { useUiStore } from '../../store/uiStore'
import { magRadius, magColorVar } from '../../lib/scales'
import { formatMag, formatDepth, formatLocalTime } from '../../lib/format'
import { Tooltip } from './primitives/Tooltip'
import type { Quake } from '../../types/quake'

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
  const land = useLandFeature()
  const [ref, { width }] = useResizeObserver<HTMLDivElement>()

  const hoveredQuakeId = useUiStore((s) => s.hoveredQuakeId)
  const setHoveredQuakeId = useUiStore((s) => s.setHoveredQuakeId)
  const pinnedQuakeId = useUiStore((s) => s.pinnedQuakeId)
  const setPinnedQuakeId = useUiStore((s) => s.setPinnedQuakeId)

  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right)
  const innerHeight = Math.max(
    MIN_INNER_HEIGHT,
    Math.min(MAX_INNER_HEIGHT, innerWidth / ASPECT),
  )
  const height = innerHeight + MARGIN.top + MARGIN.bottom

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

  const label = `World map of ${quakes.length} earthquakes, sized and colored by magnitude.`

  return (
    <div className="rounded-xl border border-border bg-surface-elevated px-5 py-4 shadow-sm">
      <h2 className="text-sm font-medium text-content-muted">
        Global epicenters
      </h2>
      <div
        ref={ref}
        className="relative mt-3"
        style={{ minHeight: MIN_INNER_HEIGHT }}
      >
        {land.isError ? (
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
              {points.map((p) => {
                const isActive = p.id === hoveredQuakeId || p.id === pinnedQuakeId
                return (
                  <circle
                    key={p.id}
                    className="geo-point"
                    data-quake-id={p.id}
                    cx={p.cx}
                    cy={p.cy}
                    r={magRadius(p.quake.mag)}
                    fill={magColorVar(p.quake.mag)}
                    fillOpacity={isActive ? 0.95 : 0.7}
                    stroke="var(--surface-elevated)"
                    strokeWidth={0.5}
                    style={{ cursor: 'pointer' }}
                    onPointerEnter={() => setHoveredQuakeId(p.id)}
                    onPointerMove={() => setHoveredQuakeId(p.id)}
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
              {/* Pinned marker: a persistent ring that stays after the pointer
                  leaves (distinct dashed ring). Rendered under the hover ring. */}
              {pinnedPoint !== null ? (
                <circle
                  data-testid="geo-pinned-ring"
                  cx={pinnedPoint.cx}
                  cy={pinnedPoint.cy}
                  r={magRadius(pinnedPoint.quake.mag) + 5}
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
                  r={magRadius(hoveredPoint.quake.mag) + 3}
                  fill="none"
                  stroke="var(--text)"
                  strokeWidth={2}
                  style={{ pointerEvents: 'none' }}
                />
              ) : null}
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
    </div>
  )
}
