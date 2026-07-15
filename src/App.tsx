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
          {/* KPI row spans the full grid; chart panels fill the rest. Each
              panel is a labelled region (aria-labelledby → its <h2>) so screen-
              reader users can navigate the dashboard by landmark. */}
          <section aria-label="Summary metrics" className="lg:col-span-12">
            <KpiRow />
          </section>
          {/* Geo-scatter is the visual centerpiece — full width. The section is
              the positioning context for the pinned DetailCard, which anchors to
              the map's bottom-right (empty ocean) on desktop so it never covers
              the histogram's bars. */}
          <section
            aria-labelledby="panel-geo-title"
            className="relative lg:col-span-12"
          >
            <GeoScatter />
            {/* Pinned-event overlay: resolved from the full feed so it survives
                brush changes. Renders nothing when no pin. */}
            <DetailCard />
          </section>
          <section
            aria-labelledby="panel-timeseries-title"
            className="lg:col-span-6"
          >
            <TimeSeriesChart />
          </section>
          <section
            aria-labelledby="panel-histogram-title"
            className="lg:col-span-6"
          >
            <MagnitudeHistogram />
          </section>
        </DashboardGrid>
      )}
    </div>
  )
}

export default App
