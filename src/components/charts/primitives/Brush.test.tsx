import { describe, expect, it } from 'vitest'
import { scaleTime } from 'd3'
import { pixelRangeToTimeRange } from '../../../lib/brush'

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
