import '@testing-library/jest-dom'

// jsdom does not implement matchMedia; provide a minimal stub so components
// that read the system color-scheme preference can render in tests.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

// jsdom implements neither PointerEvent nor the pointer-capture methods, both of
// which the React-owned Brush relies on. Provide minimal shims so pointer-event
// interaction tests can fire realistic gestures (clientX/button carry through a
// MouseEvent subclass; capture calls become no-ops).
if (typeof window.PointerEvent === 'undefined') {
  class PointerEventShim extends MouseEvent {
    readonly pointerId: number
    constructor(type: string, params: MouseEventInit & { pointerId?: number } = {}) {
      super(type, params)
      this.pointerId = params.pointerId ?? 0
    }
  }
  window.PointerEvent = PointerEventShim as unknown as typeof PointerEvent
}

if (typeof Element.prototype.setPointerCapture !== 'function') {
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.releasePointerCapture = () => {}
  Element.prototype.hasPointerCapture = () => false
}
