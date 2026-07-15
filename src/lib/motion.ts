/**
 * Detect a static reduced-motion preference. Read lazily (not at module load)
 * so tests and SSR-less environments that stub `matchMedia` behave predictably,
 * and callers always observe the current media state.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
