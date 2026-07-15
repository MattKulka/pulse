import { Header } from './components/layout/Header'
import { DashboardGrid } from './components/layout/DashboardGrid'
import { KpiRow } from './components/kpi/KpiRow'
import { TimeSeriesChart } from './components/charts/TimeSeriesChart'
import { MagnitudeHistogram } from './components/charts/MagnitudeHistogram'
import { GeoScatter } from './components/charts/GeoScatter'

function App() {
  return (
    <div className="min-h-screen bg-surface text-content transition-colors">
      <Header />
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
    </div>
  )
}

export default App
