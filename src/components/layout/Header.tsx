import { ThemeToggle } from '../ThemeToggle'
import { StaleIndicator } from '../states/StaleIndicator'

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface-elevated/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-2xl font-bold uppercase leading-none tracking-[0.14em] text-content [text-shadow:var(--glow-accent-text)]">
            Pulse
          </h1>
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-content-muted">
            Live seismic activity · USGS
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
