import type { Quake } from '../types/quake';

const MAG_DOMAIN_LO = -1;
const MAG_DOMAIN_HI = 8;
const HOUR_MS = 60 * 60 * 1000;

export function magRadius(mag: number, { min = 2, max = 22 }: { min?: number; max?: number } = {}): number {
  if (!Number.isFinite(mag)) {
    return min;
  }
  const t = (mag - MAG_DOMAIN_LO) / (MAG_DOMAIN_HI - MAG_DOMAIN_LO);
  const clamped = Math.max(0, Math.min(1, t));
  return min + (max - min) * Math.sqrt(clamped);
}

export function niceTimeDomain(quakes: Quake[]): [Date, Date] {
  if (quakes.length === 0) {
    const now = Date.now();
    return [new Date(now - 24 * HOUR_MS), new Date(now)];
  }
  const times = quakes.map((q) => q.time.getTime());
  const min = times.reduce((a, b) => (a < b ? a : b));
  const max = times.reduce((a, b) => (a > b ? a : b));
  const lo = Math.floor(min / HOUR_MS) * HOUR_MS;
  const hi = Math.ceil(max / HOUR_MS) * HOUR_MS;
  return [new Date(lo), new Date(hi)];
}

export interface MagBucket {
  /** Stable id used as the hidden-series key in the UI store. */
  key: string;
  /** Short legend label, e.g. `M<2`, `2–3`, `≥6`. */
  label: string;
  /** CSS custom-property reference for the bucket color. */
  colorVar: string;
  /** Lower bound, inclusive. */
  min: number;
  /** Upper bound, exclusive. */
  max: number;
}

/**
 * Single source of truth for the magnitude buckets. Boundaries match the
 * original magColorVar cutoffs (<2, 2–3, 3–4, 4–5, 5–6, ≥6 → --c-1..--c-6),
 * with each bucket half-open [min, max). Consumed by the legend, magBucketKey,
 * and magColorVar so the color key and series toggles never drift apart.
 */
export const MAG_BUCKETS: readonly MagBucket[] = [
  { key: 'lt2', label: 'M<2', colorVar: 'var(--c-1)', min: -Infinity, max: 2 },
  { key: '2-3', label: '2–3', colorVar: 'var(--c-2)', min: 2, max: 3 },
  { key: '3-4', label: '3–4', colorVar: 'var(--c-3)', min: 3, max: 4 },
  { key: '4-5', label: '4–5', colorVar: 'var(--c-4)', min: 4, max: 5 },
  { key: '5-6', label: '5–6', colorVar: 'var(--c-5)', min: 5, max: 6 },
  { key: 'gte6', label: '≥6', colorVar: 'var(--c-6)', min: 6, max: Infinity },
];

/**
 * The bucket key a magnitude falls into. A non-finite magnitude maps to the
 * first (least-severe) bucket, consistent with magColorVar's NaN handling.
 */
export function magBucketKey(mag: number): string {
  if (!Number.isFinite(mag)) {
    return MAG_BUCKETS[0].key;
  }
  for (const b of MAG_BUCKETS) {
    if (mag < b.max) {
      return b.key;
    }
  }
  return MAG_BUCKETS[MAG_BUCKETS.length - 1].key;
}

export function magColorVar(mag: number): string {
  const key = magBucketKey(mag);
  const bucket = MAG_BUCKETS.find((b) => b.key === key) ?? MAG_BUCKETS[0];
  return bucket.colorVar;
}
