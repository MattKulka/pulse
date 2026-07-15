import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '../App'

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  )
}

describe('App', () => {
  it('renders the Pulse heading', () => {
    renderApp()
    expect(screen.getByRole('heading', { name: /pulse/i })).toBeInTheDocument()
  })

  it('shows loading skeletons on first load, before any data arrives', () => {
    renderApp()
    // Milestone 5: with no fetched data yet the query is loading, so the KPI row
    // renders tile-shaped skeletons (not zeroed tiles) and the app doesn't crash.
    expect(screen.getAllByTestId('kpi-skeleton')).toHaveLength(3)
    expect(screen.getByTestId('freshness-indicator')).toBeInTheDocument()
  })
})
