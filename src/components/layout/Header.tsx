import { ThemeToggle } from '../ThemeToggle'

export function Header() {
  return (
    <header className="border-b border-border bg-surface-elevated">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-semibold tracking-tight text-content">Pulse</h1>
          <p className="text-sm text-content-muted">
            Live earthquake activity — USGS
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Placeholder for the stale/updated indicator (Milestone 5). */}
          <span
            data-testid="freshness-indicator"
            className="inline-flex items-center gap-1.5 text-sm text-content-muted"
          >
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-chart-3" />
            Live
          </span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
