import { useEffect, useRef, useState, type RefObject } from 'react'

export interface Size {
  width: number
  height: number
}

/**
 * Track an element's content-box size via `ResizeObserver`. Returns a ref to
 * attach to the observed element and its latest measured size.
 *
 * Before the first measurement the size is `{ width: 0, height: 0 }`; callers
 * should treat a zero width as "not yet measured" and skip rendering scales
 * (which would otherwise produce NaN / zero-range domains). The observer is
 * disconnected on unmount.
 */
export function useResizeObserver<T extends Element>(): [
  RefObject<T | null>,
  Size,
] {
  const ref = useRef<T>(null)
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })

  useEffect(() => {
    const element = ref.current
    if (element === null) {
      return
    }

    // Guard for environments (e.g. jsdom) without ResizeObserver.
    if (typeof ResizeObserver === 'undefined') {
      const rect = element.getBoundingClientRect()
      setSize({ width: rect.width, height: rect.height })
      return
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        // Skip redundant updates to avoid extra renders when the box is stable.
        setSize((prev) =>
          prev.width === width && prev.height === height
            ? prev
            : { width, height },
        )
      }
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return [ref, size]
}
