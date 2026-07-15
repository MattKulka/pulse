import { useMemo } from 'react'
import { geoEquirectangular, geoPath } from 'd3'
import { useFilteredQuakes } from '../../hooks/useFilteredQuakes'
import { useResizeObserver } from '../../hooks/useResizeObserver'
import { useLandFeature } from '../../hooks/useLandFeature'
import { magRadius, magColorVar } from '../../lib/scales'

const MARGIN = { top: 8, right: 8, bottom: 8, left: 8 }
// Equirectangular is a 2:1 projection; matching the box keeps letterboxing
// minimal while the projection itself stays undistorted (fitSize preserves it).
const ASPECT = 2
const MIN_INNER_HEIGHT = 200
const MAX_INNER_HEIGHT = 460

export function GeoScatter() {
  const quakes = useFilteredQuakes()
  const land = useLandFeature()
  const [ref, { width }] = useResizeObserver<HTMLDivElement>()

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
  const points = useMemo(() => {
    if (projection === null) {
      return []
    }
    return quakes
      .map((q) => {
        const xy = projection([q.lng, q.lat])
        if (xy === null) {
          return null
        }
        const [cx, cy] = xy
        if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
          return null
        }
        return { id: q.id, cx, cy, mag: q.mag }
      })
      .filter((p): p is { id: string; cx: number; cy: number; mag: number } =>
        p !== null,
      )
      .sort((a, b) => a.mag - b.mag)
  }, [projection, quakes])

  const label = `World map of ${quakes.length} earthquakes, sized and colored by magnitude.`

  return (
    <div className="rounded-xl border border-border bg-surface-elevated px-5 py-4 shadow-sm">
      <h2 className="text-sm font-medium text-content-muted">
        Global epicenters
      </h2>
      <div ref={ref} className="mt-3" style={{ minHeight: MIN_INNER_HEIGHT }}>
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
              {points.map((p) => (
                <circle
                  key={p.id}
                  className="geo-point"
                  cx={p.cx}
                  cy={p.cy}
                  r={magRadius(p.mag)}
                  fill={magColorVar(p.mag)}
                  fillOpacity={0.7}
                  stroke="var(--surface-elevated)"
                  strokeWidth={0.5}
                />
              ))}
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
      </div>
    </div>
  )
}
