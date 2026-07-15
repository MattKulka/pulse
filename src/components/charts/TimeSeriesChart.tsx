import { useMemo, useState } from 'react'
import { scaleLinear, scaleTime } from 'd3'
import { useVisibleQuakes } from '../../hooks/useVisibleQuakes'
import { useQuakes } from '../../hooks/useQuakes'
import { useUiStore } from '../../store/uiStore'
import { useQuakeById } from '../../hooks/useQuakeById'
import { useResizeObserver } from '../../hooks/useResizeObserver'
import { binByTime, timeBinIndexOf, type TimeBin } from '../../lib/transforms'
import { niceTimeDomain, MAG_BUCKETS } from '../../lib/scales'
import { emptyReason } from '../../lib/emptyState'
import { formatHM, formatEventCount } from '../../lib/format'
import { Axis } from './primitives/Axis'
import { Brush } from './primitives/Brush'
import { Crosshair } from './primitives/Crosshair'
import { ChartSkeleton } from '../states/Skeleton'
import { EmptyState } from '../states/EmptyState'
import {
  DataTable,
  DataTableDisclosure,
  type DataTableColumn,
} from '../a11y/DataTable'

const ALL_BUCKET_KEYS = MAG_BUCKETS.map((b) => b.key)

// Accessible data-table fallback: the same 30-minute bins the bars encode.
const TABLE_COLUMNS: DataTableColumn<TimeBin>[] = [
  { key: 'window', header: 'Time window', cell: (b) => `${formatHM(b.t0)}–${formatHM(b.t1)}` },
  { key: 'events', header: 'Events', align: 'right', cell: (b) => b.count },
]

// 30-minute buckets: a readable ~48-bar resolution across a 24h feed.
const BIN_MS = 30 * 60 * 1000
const HEIGHT = 260
const MARGIN = { top: 12, right: 14, bottom: 28, left: 34 }
const BAR_GAP = 1

export function TimeSeriesChart() {
  // The time-series renders the full 24h time context (it is NOT brush-filtered,
  // so the brush selection stays visible and adjustable) but DOES respect legend
  // series visibility — hiding a magnitude bucket lowers its bars here while the
  // histogram, map and KPIs consume useFilteredQuakes() (visible ∩ brush).
  const quakes = useVisibleQuakes()
  const { isLoading, data } = useQuakes()
  const hiddenSeries = useUiStore((s) => s.hiddenSeries)
  const brushRange = useUiStore((s) => s.brushRange)
  const setBrushRange = useUiStore((s) => s.setBrushRange)
  const clearBrush = useUiStore((s) => s.clearBrush)
  const hoveredQuakeId = useUiStore((s) => s.hoveredQuakeId)
  const hoveredQuake = useQuakeById(hoveredQuakeId)
  const [ref, { width }] = useResizeObserver<HTMLDivElement>()
  // Local hover x (plot-space px) driving the crosshair; distinct from the
  // cross-panel hovered quake. null when the pointer is off the plot.
  const [hoverX, setHoverX] = useState<number | null>(null)

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

  // Cross-panel reflection: the time bin containing the globally hovered quake.
  const hoveredBinIndex =
    hoveredQuake !== null ? timeBinIndexOf(bins, hoveredQuake.time) : -1
  const hoveredBin = hoveredBinIndex !== -1 ? bins[hoveredBinIndex] : null

  // Local crosshair: resolve the hovered plot-x to the bin under the cursor.
  const crosshairBin = useMemo(() => {
    if (hoverX === null || bins.length === 0) return null
    const idx = timeBinIndexOf(bins, x.invert(hoverX))
    return idx === -1 ? null : bins[idx]
  }, [hoverX, bins, x])

  // First load (no data yet): show a chart-shaped skeleton instead of an empty
  // plot. All hooks above run unconditionally, so this early return is safe.
  if (isLoading) {
    return <ChartSkeleton height={HEIGHT} />
  }

  // The time-series is deliberately NOT brush-filtered (it renders the full 24h
  // and dims out-of-brush bars), so brush-empty must NOT blank it — pass
  // brushRange: null so the only empty reasons here are all-hidden / no-data.
  const reason = emptyReason({
    hasData: (data?.length ?? 0) > 0,
    filteredCount: quakes.length,
    brushRange: null,
    hiddenSeries,
    allBucketKeys: ALL_BUCKET_KEYS,
  })

  return (
    <div className="panel px-5 py-4">
      {/* Header row reserves its height whether or not the Clear button is
          present, so the button appearing never shifts the layout. */}
      <div className="flex min-h-[28px] items-center justify-between gap-3">
        <h2
          id="panel-timeseries-title"
          className="panel-title flex items-center gap-2"
        >
          <span aria-hidden="true" className="panel-tick" />
          Events over time (24h)
        </h2>
        {brushRange !== null ? (
          <button
            type="button"
            onClick={clearBrush}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-content-muted hover:bg-surface hover:text-content focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated motion-safe:transition-colors"
          >
            Clear selection
          </button>
        ) : null}
      </div>
      <div ref={ref} className="mt-3" style={{ minHeight: HEIGHT }}>
        {reason !== null ? (
          <EmptyState reason={reason} className="min-h-[260px] justify-center" />
        ) : innerWidth > 0 ? (
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
              {/* Cross-panel reflection: highlight the bin holding the quake
                  hovered elsewhere (on the map). A subtle full-height band plus
                  a marker tick at the bar top — non-color signals, so the
                  emphasis reads without relying on hue. */}
              {hoveredBin !== null ? (
                <g style={{ pointerEvents: 'none' }} data-testid="ts-hover-bin">
                  <rect
                    x={x(hoveredBin.t0)}
                    y={0}
                    width={Math.max(0, x(hoveredBin.t1) - x(hoveredBin.t0) - BAR_GAP)}
                    height={innerHeight}
                    fill="var(--text)"
                    fillOpacity={0.06}
                  />
                  <rect
                    x={x(hoveredBin.t0)}
                    y={y(hoveredBin.count) - 2}
                    width={Math.max(0, x(hoveredBin.t1) - x(hoveredBin.t0) - BAR_GAP)}
                    height={3}
                    fill="var(--text)"
                  />
                </g>
              ) : null}
              {/* Bottom (time) axis. */}
              <Axis
                scale={x}
                orientation="bottom"
                transform={`translate(0,${innerHeight})`}
                tickCount={Math.max(2, Math.floor(innerWidth / 90))}
              />
              {/* Brush overlay: drawn last so it sits above the bars and axis
                  and receives pointer/touch input across the whole plot. Also
                  reports hover x so the crosshair can share this one surface —
                  hover shows the crosshair, drag brushes. */}
              <Brush
                xScale={x}
                innerWidth={innerWidth}
                innerHeight={innerHeight}
                brushRange={brushRange}
                onBrush={setBrushRange}
                onHover={setHoverX}
              />
              {/* Local crosshair guide + bin label. pointerEvents:none, drawn
                  above the brush so it never blocks the drag surface. */}
              {hoverX !== null && crosshairBin !== null ? (
                <Crosshair
                  x={hoverX}
                  innerWidth={innerWidth}
                  innerHeight={innerHeight}
                  label={`${formatHM(crosshairBin.t0)}–${formatHM(crosshairBin.t1)} · ${formatEventCount(crosshairBin.count)}`}
                />
              ) : null}
            </g>
          </svg>
        ) : null}
      </div>
      {hasData ? (
        <DataTableDisclosure
          summary="View data table"
          testId="timeseries-data-table"
        >
          <DataTable
            caption={`Events per 30-minute window over the last 24 hours (${bins.length} windows, ${quakes.length} events).`}
            columns={TABLE_COLUMNS}
            rows={bins}
            rowKey={(b) => b.t0.toISOString()}
          />
        </DataTableDisclosure>
      ) : null}
    </div>
  )
}
