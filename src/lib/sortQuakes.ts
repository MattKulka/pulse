import type { Quake } from '../types/quake';

/** How the epicenter list orders its rows. */
export type QuakeSortMode = 'magnitude' | 'recent';

/**
 * A finite magnitude for ordering; non-finite magnitudes sort to the bottom
 * under a descending sort (treated as the least significant).
 */
function magValue(mag: number): number {
  return Number.isFinite(mag) ? mag : -Infinity;
}

/**
 * Order earthquakes for the epicenter list. Pure and non-mutating — copies
 * before sorting so the caller's array order is preserved.
 *
 * - `magnitude`: descending magnitude (most significant first).
 * - `recent`:    descending time (newest first).
 *
 * `Array.prototype.sort` is a stable sort (ECMAScript 2019+), so events that
 * tie on the sort key keep their input relative order.
 */
export function sortQuakes(quakes: Quake[], mode: QuakeSortMode): Quake[] {
  const copy = [...quakes];
  if (mode === 'recent') {
    copy.sort((a, b) => b.time.getTime() - a.time.getTime());
  } else {
    copy.sort((a, b) => magValue(b.mag) - magValue(a.mag));
  }
  return copy;
}
