import { useUiStore } from '../../store/uiStore'
import { MAG_BUCKETS } from '../../lib/scales'

/**
 * Magnitude legend + series toggles. Doubles as the dashboard-wide color key:
 * each button shows the bucket's swatch + label and toggles that series via the
 * store's hiddenSeries set, hiding/showing those quakes across every panel.
 *
 * A hidden bucket is distinguished by MORE than color — it dims, strikes through
 * its label, and hollows its swatch — and exposes state to assistive tech via
 * aria-pressed + an explicit "currently shown/hidden" label. Buttons are
 * keyboard-focusable with a visible focus ring.
 */
export function Legend() {
  const hiddenSeries = useUiStore((s) => s.hiddenSeries)
  const toggleSeries = useUiStore((s) => s.toggleSeries)

  return (
    <div
      role="group"
      aria-label="Magnitude legend — toggle series on or off"
      className="flex flex-wrap items-center gap-1.5"
    >
      {MAG_BUCKETS.map((b) => {
        const hidden = hiddenSeries.has(b.key)
        return (
          <button
            key={b.key}
            type="button"
            data-testid={`legend-toggle-${b.key}`}
            aria-pressed={!hidden}
            aria-label={`Toggle magnitude ${b.label} series (currently ${hidden ? 'hidden' : 'shown'})`}
            onClick={() => toggleSeries(b.key)}
            className={`inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs font-medium text-content-muted hover:bg-surface hover:text-content focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated motion-safe:transition-colors ${
              hidden ? 'opacity-50' : ''
            }`}
          >
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-[3px] border"
              style={{
                borderColor: b.colorVar,
                backgroundColor: hidden ? 'transparent' : b.colorVar,
              }}
            />
            <span className={hidden ? 'line-through' : ''}>{b.label}</span>
          </button>
        )
      })}
    </div>
  )
}
