import { Header } from './components/layout/Header'
import { DashboardGrid } from './components/layout/DashboardGrid'
import { KpiRow } from './components/kpi/KpiRow'
import { TimeSeriesChart } from './components/charts/TimeSeriesChart'

function App() {
  return (
    <div className="min-h-screen bg-surface text-content transition-colors">
      <Header />
      <DashboardGrid>
        {/* KPI row spans the full grid; chart panels fill the rest. */}
        <section className="lg:col-span-12">
          <KpiRow />
        </section>
        <section className="lg:col-span-12">
          <TimeSeriesChart />
        </section>
      </DashboardGrid>
    </div>
  )
}

export default App
