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

export function magColorVar(mag: number): string {
  if (!Number.isFinite(mag)) return 'var(--c-1)';
  if (mag < 2) return 'var(--c-1)';
  if (mag < 3) return 'var(--c-2)';
  if (mag < 4) return 'var(--c-3)';
  if (mag < 5) return 'var(--c-4)';
  if (mag < 6) return 'var(--c-5)';
  return 'var(--c-6)';
}
