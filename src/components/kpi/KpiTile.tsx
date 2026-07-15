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
      className="panel px-5 py-4"
    >
      {/* Decorative glowing accent bar — purely visual, hidden from assistive
          tech. Sits above the panel's top-edge line. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 z-10 w-[3px] bg-accent shadow-[0_0_12px_var(--accent)]"
      />
      {/* The group's aria-label already conveys "label: value unit" as a single
          settled announcement, so the visual dt/dd are hidden from AT to avoid
          announcing the label + (mid-animation) value a second time. */}
      <dt aria-hidden="true" className="panel-title">
        {label}
      </dt>
      <dd aria-hidden="true" className="mt-2 flex items-baseline gap-1">
        <span className="font-mono text-4xl font-semibold tabular-nums tracking-tight text-content [text-shadow:var(--glow-accent-text)]">
          {display}
        </span>
        {unit ? (
          <span className="font-mono text-base font-medium text-content-muted">
            {unit}
          </span>
        ) : null}
      </dd>
    </div>
  )
}
