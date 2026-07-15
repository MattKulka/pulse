import { ThemeToggle } from './components/ThemeToggle'

function App() {
  return (
    <div className="min-h-screen bg-surface text-content transition-colors">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pulse</h1>
          <p className="text-sm text-content-muted">
            Live earthquake analytics dashboard
          </p>
        </div>
        <ThemeToggle />
      </header>

      <main className="px-6 py-10">
        <p className="text-content-muted">
          Foundational setup complete. Dashboard modules coming next.
        </p>
      </main>
    </div>
  )
}

export default App
