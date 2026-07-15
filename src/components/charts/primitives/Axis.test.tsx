import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { scaleLinear, scaleTime } from 'd3'
import { Axis } from './Axis'

function renderSvg(node: React.ReactNode) {
  return render(<svg>{node}</svg>)
}

describe('Axis', () => {
  it('renders tick labels for a linear scale', () => {
    const scale = scaleLinear().domain([0, 10]).range([200, 0])
    const { container } = renderSvg(
      <Axis scale={scale} orientation="left" tickCount={5} />,
    )
    const labels = Array.from(container.querySelectorAll('text')).map(
      (t) => t.textContent,
    )
    // d3 chooses ~5 nice ticks for [0,10]; endpoints must be present.
    expect(labels).toContain('0')
    expect(labels).toContain('10')
    expect(labels.length).toBeGreaterThan(1)
  })

  it('draws gridlines (aria-hidden) only when gridLength is given', () => {
    const scale = scaleLinear().domain([0, 4]).range([100, 0])
    const withGrid = renderSvg(
      <Axis scale={scale} orientation="left" gridLength={300} />,
    )
    expect(
      withGrid.container.querySelectorAll('line[aria-hidden="true"]').length,
    ).toBeGreaterThan(0)

    const withoutGrid = renderSvg(<Axis scale={scale} orientation="left" />)
    expect(
      withoutGrid.container.querySelectorAll('line[aria-hidden="true"]').length,
    ).toBe(0)
  })

  it('positions a bottom time axis without throwing', () => {
    const scale = scaleTime()
      .domain([new Date('2026-07-15T00:00:00Z'), new Date('2026-07-16T00:00:00Z')])
      .range([0, 600])
    const { container } = renderSvg(
      <Axis scale={scale} orientation="bottom" tickCount={6} />,
    )
    expect(container.querySelectorAll('text').length).toBeGreaterThan(1)
  })
})
