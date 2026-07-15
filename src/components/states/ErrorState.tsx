interface ErrorStateProps {
  /** Optional underlying error detail (e.g. `error.message`) shown as subtext. */
  message?: string
  /** Invoked by the Retry button — wire to the query's `refetch`. */
  onRetry: () => void
}

/**
 * Dashboard-level failure card shown when the earthquake feed can't be loaded
 * and there's no prior data to fall back to. `role="alert"` announces it to
 * assistive tech; the Retry button is keyboard-focusable with a visible focus
 * ring and calls `refetch()` to recover.
 */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      data-testid="error-state"
      className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-border bg-surface-elevated px-6 py-10 text-center shadow-sm"
    >
      <span
        aria-hidden="true"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-chart-2/15 text-lg font-semibold text-chart-2"
      >
        !
      </span>
      <div className="space-y-1">
        <p className="text-base font-semibold text-content">
          Couldn&rsquo;t load earthquake data
        </p>
        <p className="text-sm text-content-muted">
          {message ?? 'Check your connection and try again.'}
        </p>
      </div>
      <button
        type="button"
        data-testid="error-retry"
        onClick={onRetry}
        className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-content hover:bg-border/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-chart-1 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated motion-safe:transition-colors"
      >
        Retry
      </button>
    </div>
  )
}
