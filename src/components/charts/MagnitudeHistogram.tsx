import { useMemo } from 'react'
import { scaleLinear } from 'd3'
import { useFilteredQuakes } from '../../hooks/useFilteredQuakes'
import { useResizeObserver } from '../../hooks/useResizeObserver'
import { magnitudeHistogram } from '../../lib/transforms'
import { magColorVar } from '../../lib/scales'
import { Axis } from './primitives/Axis'

const STEP = 0.5
const HEIGHT = 260
const MARGIN = { top: 12, right: 14, bottom: 28, left: 34 }
const BAR_GAP = 1

export function MagnitudeHistogram() {
  const quakes = useFilteredQuakes()
  const [ref, { width }] = useResizeObserver<HTMLDivElement>()

  const bins = useMemo(() => magnitudeHistogram(quakes, STEP), [quakes])

  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right)
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom

  const minX0 = bins.length > 0 ? bins[0].x0 : 0
  const maxX1 = bins.length > 0 ? bins[bins.length - 1].x1 : 1
  const maxCount = bins.reduce((m, b) => (b.count > m ? b.count : m), 0)

  // Scales (d3 = math only; React renders the SVG below).
  const x = useMemo(
    () => scaleLinear().domain([minX0, maxX1]).range([0, innerWidth]),
    [minX0, maxX1, innerWidth],
  )
  const y = useMemo(
    () =>
      scaleLinear()
        .domain([0, Math.max(1, maxCount)])
        .range([innerHeight, 0])
        .nice(),
    [maxCount, innerHeight],
  )

  const hasData = bins.length > 0

  // Identify the most-populated bucket for the accessible summary.
  const peak = bins.reduce<{ x0: number; x1: number; count: number } | null>(
    (best, b) => (best === null || b.count > best.count ? b : best),
    null,
  )
  const label =
    hasData && peak !== null
      ? `Magnitude distribution of ${quakes.length} earthquakes; most common bucket M ${peak.x0.toFixed(1)}–${peak.x1.toFixed(1)} with ${peak.count} events.`
      : 'Magnitude distribution: no events yet.'

  return (
    <div className="rounded-xl border border-border bg-surface-elevated px-5 py-4 shadow-sm">
      <h2 className="text-sm font-medium text-content-muted">
        Magnitude distribution
      </h2>
      <div ref={ref} className="mt-3" style={{ minHeight: HEIGHT }}>
        {innerWidth > 0 ? (
          <svg
            role="img"
            aria-label={label}
            width={width}
            height={HEIGHT}
            style={{ display: 'block' }}
          >
            <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
              {/* Left axis + horizontal gridlines for reading counts. */}
              <Axis
                scale={y}
                orientation="left"
                gridLength={innerWidth}
                tickCount={Math.min(5, Math.max(1, Math.ceil(maxCount)))}
              />
              {/* Bars. Same Safari-safe technique as TimeSeriesChart: each rect
                  is drawn at the FULL inner height and sized via inline
                  transform: scaleY(...) so the .ts-bar CSS animates the tween in
                  every browser (WebKit does not transition SVG y/height attrs).
                  Colored by bucket magnitude via magColorVar; the x-axis already
                  encodes magnitude, so color is a redundant (not sole) signal. */}
              {bins.map((bin) => {
                const bx = x(bin.x0)
                const bw = Math.max(0, x(bin.x1) - bx - BAR_GAP)
                const scaleY = (innerHeight - y(bin.count)) / innerHeight
                const mid = (bin.x0 + bin.x1) / 2
                return (
                  <rect
                    key={bin.x0}
                    className="ts-bar"
                    x={bx}
                    y={0}
                    width={bw}
                    height={innerHeight}
                    fill={magColorVar(mid)}
                    style={{ transform: `scaleY(${scaleY})` }}
                  />
                )
              })}
              {/* Bottom (magnitude) axis. */}
              <Axis
                scale={x}
                orientation="bottom"
                transform={`translate(0,${innerHeight})`}
                tickCount={Math.max(2, Math.floor(innerWidth / 60))}
              />
            </g>
            {!hasData ? (
              <text
                x={width / 2}
                y={HEIGHT / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--text-muted)"
                fontSize={13}
              >
                Waiting for earthquake data…
              </text>
            ) : null}
          </svg>
        ) : null}
      </div>
    </div>
  )
}
