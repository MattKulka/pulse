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

  // Whenever the visible set is empty (any non-null reason — all series hidden,
  // an empty brush window, OR filters that happen to leave 0 in view while the
  // feed still has data), show the context-aware empty state rather than a
  // misleading row of 0s. `emptyReason` only returns non-null when the filtered
  // count is 0, so a genuinely-empty feed reads "no data" and a filter-caused
  // emptiness never masquerades as real zeros.
  if (reason !== null) {
    return (
      <div className="panel">
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
