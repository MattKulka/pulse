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

  it('renders the KPI tiles without data', () => {
    renderApp()
    // With no fetched data yet, KPIs render gracefully (all zero, no crash).
    expect(screen.getByRole('group', { name: /total events/i })).toBeInTheDocument()
  })
})
