import { ThemeToggle } from '../ThemeToggle'
import { StaleIndicator } from '../states/StaleIndicator'

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
          <StaleIndicator />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
