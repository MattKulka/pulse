import type { Quake } from '../types/quake';

/**
 * Rows for the geo-scatter's accessible data-table fallback: the events sorted
 * by descending magnitude (most significant first) and capped to `limit` so the
 * table stays scannable when the feed is large. Pure and non-mutating — it
 * copies before sorting so the caller's array order is preserved.
 */
export function geoTableRows(quakes: Quake[], limit: number): Quake[] {
  const capped = Math.max(0, limit);
  return [...quakes].sort((a, b) => b.mag - a.mag).slice(0, capped);
}
