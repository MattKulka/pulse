import { useMemo, useState } from 'react'
import { scaleLinear } from 'd3'
import { useFilteredQuakes } from '../../hooks/useFilteredQuakes'
import { useQuakes } from '../../hooks/useQuakes'
import { useUiStore } from '../../store/uiStore'
import { useQuakeById } from '../../hooks/useQuakeById'
import { useResizeObserver } from '../../hooks/useResizeObserver'
import { magnitudeHistogram, magBinIndexOf } from '../../lib/transforms'
import { magColorVar, MAG_BUCKETS } from '../../lib/scales'
import { emptyReason } from '../../lib/emptyState'
import { formatEventCount } from '../../lib/format'
import { Axis } from './primitives/Axis'
import { ChartSkeleton } from '../states/Skeleton'
import { EmptyState } from '../states/EmptyState'

const ALL_BUCKET_KEYS = MAG_BUCKETS.map((b) => b.key)

const STEP = 0.5
const HEIGHT = 260
const MARGIN = { top: 12, right: 14, bottom: 28, left: 34 }
const BAR_GAP = 1

export function MagnitudeHistogram() {
  const quakes = useFilteredQuakes()
  const { isLoading, data } = useQuakes()
  const hiddenSeries = useUiStore((s) => s.hiddenSeries)
  const brushRange = useUiStore((s) => s.brushRange)
  const hoveredQuakeId = useUiStore((s) => s.hoveredQuakeId)
  const hoveredQuake = useQuakeById(hoveredQuakeId)
  const [ref, { width }] = useResizeObserver<HTMLDivElement>()
  // Local per-bar hover (bucket index) for a lightweight count tooltip; null off-bar.
  const [hoverBucket, setHoverBucket] = useState<number | null>(null)

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

  // Cross-panel reflection: the bucket containing the globally hovered quake.
  const hoveredBucketIndex =
    hoveredQuake !== null ? magBinIndexOf(bins, hoveredQuake.mag) : -1
  // Emphasize the reflected bucket, or the locally hovered bar when no cross-
  // panel hover is active. Reflection takes precedence.
  const emphasizedIndex = hoveredBucketIndex !== -1 ? hoveredBucketIndex : hoverBucket
  const emphasizedBin =
    emphasizedIndex !== null && emphasizedIndex >= 0 && emphasizedIndex < bins.length
      ? bins[emphasizedIndex]
      : null

  // First load: chart-shaped skeleton. Safe early return — all hooks ran above.
  if (isLoading) {
    return <ChartSkeleton height={HEIGHT} />
  }

  // The histogram consumes visible ∩ brush, so an empty brush window is a real
  // empty reason here (unlike the time-series).
  const reason = emptyReason({
    hasData: (data?.length ?? 0) > 0,
    filteredCount: quakes.length,
    brushRange,
    hiddenSeries,
    allBucketKeys: ALL_BUCKET_KEYS,
  })

  return (
    <div className="rounded-xl border border-border bg-surface-elevated px-5 py-4 shadow-sm">
      <h2 className="text-sm font-medium text-content-muted">
        Magnitude distribution
      </h2>
      <div ref={ref} className="mt-3" style={{ minHeight: HEIGHT }}>
        {reason !== null ? (
          <EmptyState reason={reason} className="min-h-[260px] justify-center" />
        ) : innerWidth > 0 ? (
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
              {bins.map((bin, i) => {
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
                    style={{ transform: `scaleY(${scaleY})`, cursor: 'pointer' }}
                    onPointerEnter={() => setHoverBucket(i)}
                    onPointerLeave={() =>
                      setHoverBucket((cur) => (cur === i ? null : cur))
                    }
                  />
                )
              })}
              {/* Cross-panel reflection / local bar hover: emphasize the bucket
                  with a full-height band + a marker tick at the bar top, plus a
                  small count label. Non-color signals, so it reads without hue. */}
              {emphasizedBin !== null ? (
                <g style={{ pointerEvents: 'none' }} data-testid="hist-emphasis">
                  <rect
                    x={x(emphasizedBin.x0)}
                    y={0}
                    width={Math.max(0, x(emphasizedBin.x1) - x(emphasizedBin.x0) - BAR_GAP)}
                    height={innerHeight}
                    fill="var(--text)"
                    fillOpacity={0.06}
                  />
                  <rect
                    x={x(emphasizedBin.x0)}
                    y={y(emphasizedBin.count) - 2}
                    width={Math.max(0, x(emphasizedBin.x1) - x(emphasizedBin.x0) - BAR_GAP)}
                    height={3}
                    fill="var(--text)"
                  />
                  <text
                    x={(x(emphasizedBin.x0) + x(emphasizedBin.x1)) / 2}
                    y={Math.max(9, y(emphasizedBin.count) - 8)}
                    textAnchor="middle"
                    fontSize={11}
                    fill="var(--text)"
                  >
                    {formatEventCount(emphasizedBin.count)}
                  </text>
                </g>
              ) : null}
              {/* Bottom (magnitude) axis. */}
              <Axis
                scale={x}
                orientation="bottom"
                transform={`translate(0,${innerHeight})`}
                tickCount={Math.max(2, Math.floor(innerWidth / 60))}
              />
            </g>
          </svg>
        ) : null}
      </div>
    </div>
  )
}
