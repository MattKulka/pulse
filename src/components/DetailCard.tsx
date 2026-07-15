import { useEffect, useRef } from 'react'
import { useUiStore } from '../store/uiStore'
import { useQuakeById } from '../hooks/useQuakeById'
import {
  formatMag,
  formatDepth,
  formatDateTime,
  formatLatLng,
  usgsEventUrl,
} from '../lib/format'

/**
 * Detail card for the pinned quake. A pin is an explicit user action, so it is
 * resolved from the FULL (unfiltered) feed via useQuakeById: if the current
 * brush would exclude the pinned quake we KEEP showing the card rather than
 * silently dropping the pin — clearing it on a brush change is the more
 * surprising behavior. The pin persists until the user explicitly closes it.
 *
 * Non-modal (aria-modal=false) so the dashboard behind it stays usable; the
 * close button is focused on open, has a visible focus ring, and Escape closes.
 */
export function DetailCard() {
  const pinnedQuakeId = useUiStore((s) => s.pinnedQuakeId)
  const setPinnedQuakeId = useUiStore((s) => s.setPinnedQuakeId)
  const quake = useQuakeById(pinnedQuakeId)
  const closeRef = useRef<HTMLButtonElement>(null)

  const isOpen = pinnedQuakeId !== null && quake !== null

  // Move focus to the close control when the card opens so keyboard users land
  // on the dismiss affordance (and Escape works immediately).
  useEffect(() => {
    if (isOpen) {
      closeRef.current?.focus()
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  const close = (): void => setPinnedQuakeId(null)

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={`Earthquake details: ${quake.place}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          close()
        }
      }}
      className="fixed bottom-4 right-4 z-50 w-[20rem] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface-elevated p-4 text-sm shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-content-muted">
            Pinned event
          </div>
          <h3 className="mt-0.5 truncate font-medium text-content" title={quake.place}>
            {quake.place}
          </h3>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={close}
          aria-label="Close details and unpin"
          className="shrink-0 rounded-md border border-border px-2 py-1 text-xs font-medium text-content-muted hover:bg-surface hover:text-content focus:outline-none focus-visible:ring-2 focus-visible:ring-chart-1 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated motion-safe:transition-colors"
        >
          Close
        </button>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
        <div>
          <dt className="text-xs text-content-muted">Magnitude</dt>
          <dd className="text-content">{formatMag(quake.mag)}</dd>
        </div>
        <div>
          <dt className="text-xs text-content-muted">Depth</dt>
          <dd className="text-content">{formatDepth(quake.depth)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-content-muted">Time</dt>
          <dd className="text-content">{formatDateTime(quake.time)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-content-muted">Coordinates</dt>
          <dd className="text-content">{formatLatLng(quake.lat, quake.lng)}</dd>
        </div>
      </dl>

      <a
        href={usgsEventUrl(quake.id)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1 rounded-md text-xs font-medium text-chart-1 underline underline-offset-2 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-chart-1 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated"
      >
        View on USGS
        <span aria-hidden="true">↗</span>
      </a>
    </div>
  )
}
