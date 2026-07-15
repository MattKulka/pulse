import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { DataTable, DataTableDisclosure, type DataTableColumn } from './DataTable'

interface Row {
  window: string
  events: number
}

const columns: DataTableColumn<Row>[] = [
  { key: 'window', header: 'Time window', cell: (r) => r.window },
  { key: 'events', header: 'Events', align: 'right', cell: (r) => r.events },
]

const rows: Row[] = [
  { window: '00:00–00:30', events: 3 },
  { window: '00:30–01:00', events: 5 },
]

describe('DataTable', () => {
  it('renders a semantic table with a caption and scoped column headers', () => {
    render(
      <DataTable
        caption="2 windows"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.window}
      />,
    )
    const table = screen.getByRole('table')
    // Caption is the table's accessible name.
    expect(table).toHaveAccessibleName('2 windows')
    const headers = within(table).getAllByRole('columnheader')
    expect(headers.map((h) => h.textContent)).toEqual(['Time window', 'Events'])
    headers.forEach((h) => expect(h).toHaveAttribute('scope', 'col'))
    // One header row + one row per datum.
    expect(within(table).getAllByRole('row')).toHaveLength(rows.length + 1)
    expect(screen.getByText('00:30–01:00')).toBeInTheDocument()
  })
})

describe('DataTableDisclosure', () => {
  it('exposes a focusable summary that gates the table content', () => {
    render(
      <DataTableDisclosure summary="View data table" testId="disclosure">
        <DataTable
          caption="2 windows"
          columns={columns}
          rows={rows}
          rowKey={(r) => r.window}
        />
      </DataTableDisclosure>,
    )
    // The summary carries the accessible name and toggles natively.
    expect(
      screen.getByText('View data table').closest('summary'),
    ).toBeInTheDocument()
    // Table is in the accessible tree (collapsed <details> still renders it).
    expect(screen.getByRole('table', { hidden: true })).toBeInTheDocument()
  })
})
