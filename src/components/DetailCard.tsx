import { useEffect, useRef } from 'react'
import { useUiStore } from '../store/uiStore'
import { useQuakes } from '../hooks/useQuakes'
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
 *
 * Placement: on desktop it is absolutely anchored to the bottom-right of the map
 * panel (its `relative` section in App) — empty ocean space — so it never covers
 * the magnitude histogram's bars. On small screens it becomes a fixed,
 * full-width card pinned to the bottom edge so it stays readable and on-screen.
 * Both positionings are out of flow, so opening/closing causes no layout shift.
 */
export function DetailCard() {
  const pinnedQuakeId = useUiStore((s) => s.pinnedQuakeId)
  const setPinnedQuakeId = useUiStore((s) => s.setPinnedQuakeId)
  const feed = useQuakes().data
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

  // Clear a dangling pin only when the quake is truly gone from the FULL feed
  // (e.g. a background refetch dropped it). Gated on `feed !== undefined` so a
  // not-yet-loaded feed never clears the pin, and — because resolution is
  // against the full feed — a brush that merely hides the quake never does either.
  useEffect(() => {
    if (pinnedQuakeId !== null && feed !== undefined && quake === null) {
      setPinnedQuakeId(null)
    }
  }, [pinnedQuakeId, feed, quake, setPinnedQuakeId])

  // Document-level Escape so the card closes even when focus has moved off it
  // (e.g. after tabbing to the USGS link). Registered only while open.
  useEffect(() => {
    if (!isOpen) {
      return
    }
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setPinnedQuakeId(null)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, setPinnedQuakeId])

  if (!isOpen) {
    return null
  }

  const close = (): void => setPinnedQuakeId(null)

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={`Earthquake details: ${quake.place}`}
      className="fixed inset-x-3 bottom-3 z-50 w-auto rounded-xl border border-border-accent bg-surface-elevated p-4 text-sm shadow-lg backdrop-blur-md sm:absolute sm:inset-x-auto sm:bottom-4 sm:right-4 sm:z-20 sm:w-[20rem] sm:max-w-[calc(100%-2rem)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="panel-title">Pinned event</div>
          <h3 className="mt-0.5 truncate font-medium text-content" title={quake.place}>
            {quake.place}
          </h3>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={close}
          aria-label="Close details and unpin"
          className="shrink-0 rounded-md border border-border px-2 py-1 text-xs font-medium text-content-muted hover:bg-surface hover:text-content focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated motion-safe:transition-colors"
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
        className="mt-3 inline-flex items-center gap-1 rounded-md text-xs font-medium text-accent underline underline-offset-2 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated"
      >
        View on USGS
        <span aria-hidden="true">↗</span>
      </a>
    </div>
  )
}
