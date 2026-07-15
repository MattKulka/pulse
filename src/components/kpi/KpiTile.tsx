import { useCountUp } from '../../hooks/useCountUp'

interface KpiTileProps {
  label: string
  value: number
  /** Optional unit appended after the value (e.g. "km"). */
  unit?: string
  /**
   * Formats the animated numeric value for display. Defaults to a rounded
   * integer. maxMag/avgDepth pass a decimal formatter.
   */
  format?: (value: number) => string
}

const defaultFormat = (v: number): string => String(Math.round(v))

export function KpiTile({ label, value, unit, format = defaultFormat }: KpiTileProps) {
  const animated = useCountUp(value)
  const display = format(animated)
  // Announce the settled target value (not each animation frame) to assistive
  // tech, and keep the visual/spoken content in sync via aria-label on the card.
  const spoken = `${label}: ${format(value)}${unit ? ` ${unit}` : ''}`

  return (
    <div
      role="group"
      aria-label={spoken}
      className="relative overflow-hidden rounded-xl border border-border bg-surface-elevated px-5 py-4 shadow-sm"
    >
      {/* Decorative accent bar — purely visual, hidden from assistive tech. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1 bg-chart-1"
      />
      {/* The group's aria-label already conveys "label: value unit" as a single
          settled announcement, so the visual dt/dd are hidden from AT to avoid
          announcing the label + (mid-animation) value a second time. */}
      <dt aria-hidden="true" className="text-sm font-medium text-content-muted">
        {label}
      </dt>
      <dd aria-hidden="true" className="mt-1 flex items-baseline gap-1">
        <span className="text-3xl font-semibold tabular-nums tracking-tight text-content">
          {display}
        </span>
        {unit ? (
          <span className="text-base font-medium text-content-muted">{unit}</span>
        ) : null}
      </dd>
    </div>
  )
}
