import type { EmptyReason } from '../../lib/emptyState'

/** The non-null empty reasons this component knows how to render copy for. */
type Reason = Exclude<EmptyReason, null>

interface ReasonCopy {
  title: string
  message: string
}

/**
 * Context-aware copy per empty reason. The reason is computed by
 * `emptyReason()`; this map only turns it into user-facing text so the wording
 * lives in one place across every panel.
 */
const COPY: Record<Reason, ReasonCopy> = {
  'all-hidden': {
    title: 'All series hidden',
    message: 'All magnitude series are hidden — re-enable one from the legend.',
  },
  'brush-empty': {
    title: 'Empty selection',
    message: 'No earthquakes in the selected time range.',
  },
  'no-data': {
    title: 'Nothing to show',
    message: 'No earthquake data available right now.',
  },
}

interface EmptyStateProps {
  reason: Reason
  /** Extra classes for the wrapper (e.g. to set a min-height matching a panel). */
  className?: string
}

/**
 * Small presentational empty-state block a panel renders in place of its chart
 * when there's nothing to draw. `data-reason` exposes the reason for tests and
 * visual verification without coupling to the copy strings.
 */
export function EmptyState({ reason, className = '' }: EmptyStateProps) {
  const { title, message } = COPY[reason]
  return (
    <div
      data-testid="empty-state"
      data-reason={reason}
      className={`flex flex-col items-center justify-center gap-1 px-6 py-12 text-center ${className}`}
    >
      <span
        aria-hidden="true"
        className="mb-1 flex h-9 w-9 items-center justify-center rounded-full border border-border text-content-muted"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" />
        </svg>
      </span>
      <p className="text-sm font-medium text-content">{title}</p>
      <p className="max-w-xs text-sm text-content-muted">{message}</p>
    </div>
  )
}
