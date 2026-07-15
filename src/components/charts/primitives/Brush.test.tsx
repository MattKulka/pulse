import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { scaleTime } from 'd3'
import { pixelRangeToTimeRange } from '../../../lib/brush'
import { Brush } from './Brush'

const t0 = new Date('2026-07-15T00:00:00Z')
const t1 = new Date('2026-07-16T00:00:00Z')

function scale() {
  return scaleTime().domain([t0, t1]).range([0, 1000])
}

describe('pixelRangeToTimeRange', () => {
  it('maps pixels to time linearly across the domain', () => {
    const [a, b] = pixelRangeToTimeRange(scale(), 250, 750)
    // 25% and 75% of a 24h span → 06:00 and 18:00.
    expect(a.toISOString()).toBe('2026-07-15T06:00:00.000Z')
    expect(b.toISOString()).toBe('2026-07-15T18:00:00.000Z')
  })

  it('orders start before end regardless of drag direction', () => {
    const forward = pixelRangeToTimeRange(scale(), 200, 800)
    const backward = pixelRangeToTimeRange(scale(), 800, 200)
    expect(backward[0].getTime()).toBe(forward[0].getTime())
    expect(backward[1].getTime()).toBe(forward[1].getTime())
    expect(backward[0].getTime()).toBeLessThan(backward[1].getTime())
  })

  it('clamps pixels beyond the range to the domain bounds', () => {
    const [a, b] = pixelRangeToTimeRange(scale(), -500, 5000)
    expect(a.getTime()).toBe(t0.getTime())
    expect(b.getTime()).toBe(t1.getTime())
  })
})

// jsdom's getBoundingClientRect returns all-zero, so the overlay's client left
// is 0 and clientX maps directly to plot-space pixel x — convenient for driving
// deterministic gestures.
function renderBrush(
  brushRange: [Date, Date] | null,
  onBrush: (r: [Date, Date] | null) => void,
) {
  render(
    <svg>
      <Brush
        xScale={scale()}
        innerWidth={1000}
        innerHeight={200}
        brushRange={brushRange}
        onBrush={onBrush}
      />
    </svg>,
  )
  return screen.getByTestId('brush-overlay')
}

describe('Brush interactions', () => {
  it('commits an ordered [start,end] range for a drag past MIN_DRAG_PX', () => {
    const onBrush = vi.fn()
    const overlay = renderBrush(null, onBrush)

    fireEvent.pointerDown(overlay, { clientX: 200, button: 0, pointerId: 1 })
    fireEvent.pointerMove(overlay, { clientX: 600, button: 0, pointerId: 1 })
    fireEvent.pointerUp(overlay, { clientX: 600, button: 0, pointerId: 1 })

    const last = onBrush.mock.calls.at(-1)?.[0]
    expect(last).not.toBeNull()
    // 200px and 600px of a 1000px/24h scale → 04:48 and 14:24.
    expect(last).toEqual([
      new Date('2026-07-15T04:48:00.000Z'),
      new Date('2026-07-15T14:24:00.000Z'),
    ])
  })

  it('orders the range when dragging right-to-left', () => {
    const onBrush = vi.fn()
    const overlay = renderBrush(null, onBrush)

    fireEvent.pointerDown(overlay, { clientX: 600, button: 0, pointerId: 1 })
    fireEvent.pointerMove(overlay, { clientX: 200, button: 0, pointerId: 1 })
    fireEvent.pointerUp(overlay, { clientX: 200, button: 0, pointerId: 1 })

    const last = onBrush.mock.calls.at(-1)?.[0] as [Date, Date] | null
    expect(last).not.toBeNull()
    const range = last as [Date, Date]
    expect(range[0].getTime()).toBeLessThan(range[1].getTime())
  })

  it('treats a sub-threshold press-release as click-to-clear (onBrush null)', () => {
    const onBrush = vi.fn()
    const overlay = renderBrush([t0, t1], onBrush)

    fireEvent.pointerDown(overlay, { clientX: 300, button: 0, pointerId: 1 })
    fireEvent.pointerUp(overlay, { clientX: 302, button: 0, pointerId: 1 })

    expect(onBrush).toHaveBeenLastCalledWith(null)
  })

  it('keeps committing after the pointer drags back within MIN_DRAG_PX', () => {
    const onBrush = vi.fn()
    const overlay = renderBrush(null, onBrush)

    fireEvent.pointerDown(overlay, { clientX: 300, button: 0, pointerId: 1 })
    fireEvent.pointerMove(overlay, { clientX: 500, button: 0, pointerId: 1 })
    // Wander back to 1px from the start — still a live range, not a clear.
    fireEvent.pointerMove(overlay, { clientX: 301, button: 0, pointerId: 1 })
    fireEvent.pointerUp(overlay, { clientX: 301, button: 0, pointerId: 1 })

    expect(onBrush).not.toHaveBeenLastCalledWith(null)
    expect(onBrush.mock.calls.at(-1)?.[0]).not.toBeNull()
  })

  it('reverts to the pre-drag range when the gesture is cancelled', () => {
    const previous: [Date, Date] = [
      new Date('2026-07-15T06:00:00.000Z'),
      new Date('2026-07-15T18:00:00.000Z'),
    ]
    const onBrush = vi.fn()
    const overlay = renderBrush(previous, onBrush)

    fireEvent.pointerDown(overlay, { clientX: 100, button: 0, pointerId: 1 })
    fireEvent.pointerMove(overlay, { clientX: 500, button: 0, pointerId: 1 })
    // A mid-drag range was pushed before the cancel...
    expect(onBrush.mock.calls.at(-1)?.[0]).not.toBeNull()

    fireEvent.pointerCancel(overlay, { clientX: 500, button: 0, pointerId: 1 })
    // ...and the cancel restores the exact pre-drag range.
    expect(onBrush).toHaveBeenLastCalledWith(previous)
  })
})
