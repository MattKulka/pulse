import { useCallback, useRef, useState } from 'react'

export interface Size {
  width: number
  height: number
}

/**
 * Track an element's content-box size via `ResizeObserver`. Returns a
 * **callback ref** to attach to the observed element and its latest measured
 * size.
 *
 * A callback ref (rather than a `RefObject` + mount-only effect) is deliberate:
 * charts early-return a loading skeleton that does NOT carry the ref, so the
 * observed node appears only AFTER data arrives. React invokes this callback
 * with the node whenever it mounts/unmounts, so the observer re-attaches to the
 * real element every time — a mount-only effect would observe `null` during the
 * skeleton phase and never re-attach, leaving the chart stuck at width 0.
 *
 * Before the first measurement the size is `{ width: 0, height: 0 }`; callers
 * should treat a zero width as "not yet measured" and skip rendering scales
 * (which would otherwise produce NaN / zero-range domains).
 */
export function useResizeObserver<T extends Element>(): [
  (node: T | null) => void,
  Size,
] {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })
  const observerRef = useRef<ResizeObserver | null>(null)

  const ref = useCallback((node: T | null) => {
    // Detach from any previously observed node first.
    observerRef.current?.disconnect()
    observerRef.current = null

    if (node === null) {
      return
    }

    // Guard for environments (e.g. jsdom) without ResizeObserver.
    if (typeof ResizeObserver === 'undefined') {
      const rect = node.getBoundingClientRect()
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
    observer.observe(node)
    observerRef.current = observer
  }, [])

  return [ref, size]
}
