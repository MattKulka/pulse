import type { ReactNode } from 'react'

/**
 * A single column definition for {@link DataTable}. Generic over the row type so
 * cell renderers are fully type-checked against the row shape (no `any`).
 */
export interface DataTableColumn<Row> {
  /** Stable key for React reconciliation + column identity. */
  key: string
  /** Visible column header text (also the `scope="col"` header for AT). */
  header: string
  /** Renders the cell content for a given row. */
  cell: (row: Row) => ReactNode
  /** Horizontal alignment; numeric columns read better right-aligned. */
  align?: 'left' | 'right'
}

interface DataTableProps<Row> {
  /**
   * Table caption — the accessible summary of what the table contains (e.g. the
   * total row count). Rendered visibly above the rows.
   */
  caption: ReactNode
  columns: DataTableColumn<Row>[]
  rows: Row[]
  /** Stable React key for a row. */
  rowKey: (row: Row, index: number) => string
}

/**
 * A semantic, accessible HTML table used as the keyboard/screen-reader fallback
 * for the hand-built SVG charts. Renders a real `<table>` with a `<caption>`,
 * `scope="col"` headers, and a `<tbody>` so assistive tech can inspect the same
 * data the chart visualizes. Long tables scroll inside their own container so
 * the page itself never scrolls horizontally, and the header row stays pinned
 * while the body scrolls. Themed via semantic tokens (legible in light + dark).
 */
export function DataTable<Row>({
  caption,
  columns,
  rows,
  rowKey,
}: DataTableProps<Row>) {
  return (
    <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-xs text-content">
        <caption className="px-3 pt-2 text-left text-xs text-content-muted">
          {caption}
        </caption>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`sticky top-0 z-10 border-b border-border bg-surface-elevated px-3 py-2 font-medium text-content-muted ${
                  col.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={rowKey(row, i)}
              className="border-b border-border last:border-0"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-3 py-1.5 tabular-nums ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface DataTableDisclosureProps {
  /** Visible summary label and accessible name of the toggle. */
  summary: string
  /** Optional test id on the `<details>` (lets e2e find + open the table). */
  testId?: string
  children: ReactNode
}

/**
 * A keyboard-operable disclosure wrapping a {@link DataTable}. The native
 * `<summary>` is focusable and toggles on Enter/Space with no JS, and is visible
 * to everyone (better than an sr-only table). The default disclosure marker is
 * replaced by a rotating caret with a visible `focus-visible` ring using theme
 * tokens.
 */
export function DataTableDisclosure({
  summary,
  testId,
  children,
}: DataTableDisclosureProps) {
  return (
    <details data-testid={testId} className="group mt-3">
      <summary className="inline-flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-content-muted hover:text-content focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated motion-safe:transition-colors [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden="true"
          className="inline-block text-[0.7em] motion-safe:transition-transform group-open:rotate-90"
        >
          ▶
        </span>
        {summary}
      </summary>
      {children}
    </details>
  )
}
