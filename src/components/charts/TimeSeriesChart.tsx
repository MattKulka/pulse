import { useMemo } from 'react'
import { scaleLinear, scaleTime } from 'd3'
import { useQuakes } from '../../hooks/useQuakes'
import { useUiStore } from '../../store/uiStore'
import { useResizeObserver } from '../../hooks/useResizeObserver'
import { binByTime } from '../../lib/transforms'
import { niceTimeDomain } from '../../lib/scales'
import { Axis } from './primitives/Axis'
import { Brush } from './primitives/Brush'

// 30-minute buckets: a readable ~48-bar resolution across a 24h feed.
const BIN_MS = 30 * 60 * 1000
const HEIGHT = 260
const MARGIN = { top: 12, right: 14, bottom: 28, left: 34 }
const BAR_GAP = 1

export function TimeSeriesChart() {
  // The time-series always renders the FULL 24h context (unfiltered) so the
  // brush selection stays visible and adjustable; the histogram, map and KPIs
  // consume useFilteredQuakes() and narrow to the selection instead.
  const data = useQuakes().data
  const quakes = useMemo(() => data ?? [], [data])
  const brushRange = useUiStore((s) => s.brushRange)
  const setBrushRange = useUiStore((s) => s.setBrushRange)
  const clearBrush = useUiStore((s) => s.clearBrush)
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

  // A bin is "in" the selection when its bucket overlaps the brush range;
  // outside bins dim so the selected window reads as emphasized (inclusive
  // start / exclusive end, matching filterByRange).
  const inBrush = (t0: Date, t1: Date): boolean => {
    if (brushRange === null) return true
    return t1.getTime() > brushRange[0].getTime() && t0.getTime() < brushRange[1].getTime()
  }

  return (
    <div className="rounded-xl border border-border bg-surface-elevated px-5 py-4 shadow-sm">
      {/* Header row reserves its height whether or not the Clear button is
          present, so the button appearing never shifts the layout. */}
      <div className="flex min-h-[28px] items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-content-muted">
          Events over time (24h)
        </h2>
        {brushRange !== null ? (
          <button
            type="button"
            onClick={clearBrush}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-content-muted hover:bg-surface hover:text-content focus:outline-none focus-visible:ring-2 focus-visible:ring-chart-1 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated motion-safe:transition-colors"
          >
            Clear selection
          </button>
        ) : null}
      </div>
      <div ref={ref} className="mt-3" style={{ minHeight: HEIGHT }}>
        {innerWidth > 0 ? (
          <svg
            role="img"
            aria-label={label}
            width={width}
            height={HEIGHT}
            data-testid="timeseries-svg"
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
              {/* Bars. Each rect is drawn at the FULL inner height and sized
                  via transform: scaleY (see .ts-bar in index.css) so the
                  update tween animates in every browser incl. WebKit/Safari,
                  where CSS transitions on the y/height SVG attributes do not.
                  scaleY is derived from the y scale itself so bar tops line up
                  exactly with the axis ticks/gridlines; the inline value is the
                  correct final geometry even if no animation runs. Keyed by
                  bucket so React reconciles enter/update/exit. Bars outside the
                  active brush selection dim to emphasize the selected window. */}
              {bins.map((bin) => {
                const bx = x(bin.t0)
                const bw = Math.max(0, x(bin.t1) - bx - BAR_GAP)
                const scaleY = (innerHeight - y(bin.count)) / innerHeight
                return (
                  <rect
                    key={bin.t0.toISOString()}
                    className="ts-bar"
                    x={bx}
                    y={0}
                    width={bw}
                    height={innerHeight}
                    fill="var(--c-1)"
                    fillOpacity={inBrush(bin.t0, bin.t1) ? 1 : 0.3}
                    style={{ transform: `scaleY(${scaleY})` }}
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
              {/* Brush overlay: drawn last so it sits above the bars and axis
                  and receives pointer/touch input across the whole plot. */}
              <Brush
                xScale={x}
                innerWidth={innerWidth}
                innerHeight={innerHeight}
                brushRange={brushRange}
                onBrush={setBrushRange}
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
