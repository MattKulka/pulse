import { Header } from './components/layout/Header'
import { DashboardGrid } from './components/layout/DashboardGrid'
import { KpiRow } from './components/kpi/KpiRow'
import { TimeSeriesChart } from './components/charts/TimeSeriesChart'
import { MagnitudeHistogram } from './components/charts/MagnitudeHistogram'
import { GeoScatter } from './components/charts/GeoScatter'
import { DetailCard } from './components/DetailCard'
import { ErrorState } from './components/states/ErrorState'
import { useQuakes } from './hooks/useQuakes'

function App() {
  // Error scope is dashboard-level: one shared query backs every panel, so a
  // single banner reads cleaner than repeating the same failure per panel. It
  // only takes over when the INITIAL load fails (no data yet). If a background
  // refetch fails while we already have data, we keep the last-good dashboard
  // and let the StaleIndicator surface the problem instead of blanking it.
  const { isError, data, error, refetch } = useQuakes()
  const showError = isError && data === undefined

  return (
    <div className="min-h-screen bg-surface text-content transition-colors">
      <Header />
      {showError ? (
        <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <ErrorState
            message={error?.message}
            onRetry={() => {
              void refetch()
            }}
          />
        </main>
      ) : (
        <DashboardGrid>
          {/* KPI row spans the full grid; chart panels fill the rest. */}
          <section className="lg:col-span-12">
            <KpiRow />
          </section>
          {/* Geo-scatter is the visual centerpiece — full width. */}
          <section className="lg:col-span-12">
            <GeoScatter />
          </section>
          <section className="lg:col-span-6">
            <TimeSeriesChart />
          </section>
          <section className="lg:col-span-6">
            <MagnitudeHistogram />
          </section>
        </DashboardGrid>
      )}
      {/* Pinned-event overlay: floats above the grid, resolved from the full
          feed so it survives brush changes. Renders nothing when no pin. */}
      <DetailCard />
    </div>
  )
}

export default App
