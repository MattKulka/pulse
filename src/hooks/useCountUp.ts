import { useEffect, useRef, useState } from 'react'

/**
 * Detect a static reduced-motion preference. Read lazily (not at module load)
 * so tests and SSR-less environments that stub `matchMedia` behave predictably.
 */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Classic ease-out cubic: fast start, gentle settle.
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * Animate a numeric value from 0 up to `target` over `durationMs` using
 * `requestAnimationFrame` with an ease-out curve. Returns the current value
 * (non-integer safe — the caller formats). Restarts smoothly from the current
 * displayed value whenever `target` changes, and respects the user's
 * reduced-motion preference by snapping straight to `target`.
 */
export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState<number>(() =>
    prefersReducedMotion() ? target : 0,
  )
  // Track the latest displayed value without retriggering the effect, so a new
  // target can animate from wherever the previous animation left off.
  const valueRef = useRef<number>(value)
  valueRef.current = value

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target)
      return
    }

    const from = valueRef.current
    const delta = target - from
    if (delta === 0) {
      return
    }

    let frame = 0
    let start: number | null = null

    const tick = (now: number): void => {
      if (start === null) {
        start = now
      }
      const elapsed = now - start
      const t = durationMs <= 0 ? 1 : Math.min(elapsed / durationMs, 1)
      setValue(from + delta * easeOutCubic(t))
      if (t < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        setValue(target)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, durationMs])

  return value
}
