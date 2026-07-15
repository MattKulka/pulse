import type { ReactNode } from 'react'

interface DashboardGridProps {
  children: ReactNode
}

/**
 * Responsive, centered container that holds the dashboard's panels. Single
 * column on mobile, widening to a multi-column grid on larger screens. Chart
 * panels will be added as children in later milestones.
 */
export function DashboardGrid({ children }: DashboardGridProps) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">{children}</div>
    </main>
  )
}
