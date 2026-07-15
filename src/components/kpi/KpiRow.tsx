import { useFilteredQuakes } from '../../hooks/useFilteredQuakes'
import { computeKpis } from '../../lib/transforms'
import { KpiTile } from './KpiTile'

const oneDecimal = (v: number): string => v.toFixed(1)

export function KpiRow() {
  const quakes = useFilteredQuakes()
  const { total, maxMag, avgDepth } = computeKpis(quakes)

  return (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <KpiTile label="Total events" value={total} />
      <KpiTile label="Max magnitude" value={maxMag} format={oneDecimal} />
      <KpiTile label="Avg depth" value={avgDepth} unit="km" format={oneDecimal} />
    </dl>
  )
}
