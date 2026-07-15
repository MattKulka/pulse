import { useMemo } from 'react'
import { scaleLinear, scaleTime } from 'd3'
import { useFilteredQuakes } from '../../hooks/useFilteredQuakes'
import { useResizeObserver } from '../../hooks/useResizeObserver'
import { binByTime } from '../../lib/transforms'
import { niceTimeDomain } from '../../lib/scales'
import { Axis } from './primitives/Axis'

// 30-minute buckets: a readable ~48-bar resolution across a 24h feed.
const BIN_MS = 30 * 60 * 1000
const HEIGHT = 260
const MARGIN = { top: 12, right: 14, bottom: 28, left: 34 }
const BAR_GAP = 1

export function TimeSeriesChart() {
  const quakes = useFilteredQuakes()
  const [ref, { width }] = useResizeObserver<HTMLDivElement>()

  const bins = useMemo(() => binByTime(quakes, BIN_MS), [quakes])
  const domain = useMemo(() => niceTimeDomain(quakes), [quakes])

  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right)
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom

  const maxCount = bins.reduce((m, b) => (b.count > m ? b.count : m), 0)

  // Scales (d3 = math only; React renders the SVG below).
  const x = useMemo(
    () => scaleTime().domain(domain).range([0, innerWidth]),
    [domain, innerWidth],
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
  const label = hasData
    ? `Earthquake events over the last 24 hours: ${quakes.length} total, peak ${maxCount} in a 30-minute window.`
    : 'Earthquake events over the last 24 hours: no events yet.'

  return (
    <div className="rounded-xl border border-border bg-surface-elevated px-5 py-4 shadow-sm">
      <h2 className="text-sm font-medium text-content-muted">
        Events over time (24h)
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
              {/* Bars. Keyed by bucket so React reconciles enter/update/exit;
                  CSS (.ts-bar) animates the growth and count changes. */}
              {bins.map((bin) => {
                const bx = x(bin.t0)
                const bw = Math.max(0, x(bin.t1) - bx - BAR_GAP)
                const by = y(bin.count)
                const bh = Math.max(0, innerHeight - by)
                return (
                  <rect
                    key={bin.t0.toISOString()}
                    className="ts-bar"
                    x={bx}
                    y={by}
                    width={bw}
                    height={bh}
                    rx={1}
                    fill="var(--c-1)"
                  />
                )
              })}
              {/* Bottom (time) axis. */}
              <Axis
                scale={x}
                orientation="bottom"
                transform={`translate(0,${innerHeight})`}
                tickCount={Math.max(2, Math.floor(innerWidth / 90))}
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
