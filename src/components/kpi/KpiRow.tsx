import { useFilteredQuakes } from '../../hooks/useFilteredQuakes'
import { useQuakes } from '../../hooks/useQuakes'
import { useUiStore } from '../../store/uiStore'
import { computeKpis } from '../../lib/transforms'
import { emptyReason } from '../../lib/emptyState'
import { MAG_BUCKETS } from '../../lib/scales'
import { KpiTile } from './KpiTile'
import { KpiTileSkeleton } from '../states/Skeleton'
import { EmptyState } from '../states/EmptyState'

const oneDecimal = (v: number): string => v.toFixed(1)
const ALL_BUCKET_KEYS = MAG_BUCKETS.map((b) => b.key)

export function KpiRow() {
  const { isLoading, data } = useQuakes()
  const quakes = useFilteredQuakes()
  const brushRange = useUiStore((s) => s.brushRange)
  const hiddenSeries = useUiStore((s) => s.hiddenSeries)

  // First load: three tile-shaped skeletons in the real grid so numbers don't
  // pop in against an empty row.
  if (isLoading) {
    return (
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiTileSkeleton />
        <KpiTileSkeleton />
        <KpiTileSkeleton />
      </dl>
    )
  }

  const reason = emptyReason({
    hasData: (data?.length ?? 0) > 0,
    filteredCount: quakes.length,
    brushRange,
    hiddenSeries,
    allBucketKeys: ALL_BUCKET_KEYS,
  })

  // Zeros are fine for a genuinely empty feed ('no-data'), but when the row is
  // empty because of a user-controllable filter (all series hidden, or an empty
  // brush window) say so rather than showing a misleading row of 0s.
  if (reason === 'all-hidden' || reason === 'brush-empty') {
    return (
      <div className="rounded-xl border border-border bg-surface-elevated shadow-sm">
        <EmptyState reason={reason} />
      </div>
    )
  }

  const { total, maxMag, avgDepth } = computeKpis(quakes)

  return (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <KpiTile label="Total events" value={total} />
      <KpiTile label="Max magnitude" value={maxMag} format={oneDecimal} />
      <KpiTile label="Avg depth" value={avgDepth} unit="km" format={oneDecimal} />
    </dl>
  )
}
