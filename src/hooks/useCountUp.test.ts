import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCountUp } from './useCountUp'

function mockReducedMotion(reduce: boolean): void {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: reduce && query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

afterEach(() => {
  vi.useRealTimers()
})

describe('useCountUp', () => {
  it('returns the target immediately when reduced motion is preferred', () => {
    mockReducedMotion(true)
    const { result } = renderHook(() => useCountUp(42))
    expect(result.current).toBe(42)
  })

  it('animates from 0 and settles exactly on the target', () => {
    mockReducedMotion(false)
    vi.useFakeTimers()
    const { result } = renderHook(() => useCountUp(37.5, 900))

    expect(result.current).toBe(0)

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current).toBe(37.5)
  })
})
