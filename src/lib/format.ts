import type { Quake } from '../types/quake';

/** USGS event detail page for a given event id. */
export function usgsEventUrl(id: string): string {
  return `https://earthquake.usgs.gov/earthquakes/eventpage/${id}`;
}

/** Magnitude as a compact label, e.g. `M 4.2`. */
export function formatMag(mag: number): string {
  if (!Number.isFinite(mag)) return 'M —';
  return `M ${mag.toFixed(1)}`;
}

/** Depth in kilometres, e.g. `12.4 km`. */
export function formatDepth(depthKm: number): string {
  if (!Number.isFinite(depthKm)) return '— km';
  return `${(Math.round(depthKm * 10) / 10).toFixed(1)} km`;
}

/** Local wall-clock time down to the minute, e.g. `1:05 PM`. */
export function formatLocalTime(time: Date): string {
  return time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** Local hour:minute, 24h-agnostic short form used by the crosshair labels. */
export function formatHM(time: Date): string {
  return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Full local date + time for the pinned detail card. */
export function formatDateTime(time: Date): string {
  return time.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

/** Signed lat/lng pair, e.g. `34.052°, -118.244°`. */
export function formatLatLng(lat: number, lng: number): string {
  return `${lat.toFixed(3)}°, ${lng.toFixed(3)}°`;
}

/** Pluralized event count, e.g. `1 event` / `4 events`. */
export function formatEventCount(count: number): string {
  return `${count} ${count === 1 ? 'event' : 'events'}`;
}

/** Convenience: the one-line summary used by tooltips. */
export function quakeSummary(q: Quake): string {
  return `${formatMag(q.mag)} · ${q.place}`;
}
