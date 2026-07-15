import { describe, it, expect } from 'vitest';
import type { Quake } from '../types/quake';
import { magRadius, niceTimeDomain, magColorVar } from './scales';

function q(id: string, time: string): Quake {
  return { id, time: new Date(time), mag: 1, depth: 10, lat: 0, lng: 0, place: 'x' };
}

describe('magRadius', () => {
  it('is monotonically increasing in magnitude', () => {
    expect(magRadius(1)).toBeLessThan(magRadius(3));
    expect(magRadius(3)).toBeLessThan(magRadius(5));
    expect(magRadius(5)).toBeLessThan(magRadius(7));
  });

  it('clamps to the min at/below the low extreme', () => {
    expect(magRadius(-10)).toBe(2);
    expect(magRadius(-10, { min: 4, max: 30 })).toBe(4);
  });

  it('clamps to the max at/above the high extreme', () => {
    expect(magRadius(50)).toBe(22);
    expect(magRadius(50, { min: 4, max: 30 })).toBe(30);
  });

  it('stays within [min, max] for typical magnitudes', () => {
    for (const m of [-1, 0, 2, 4.5, 6, 8]) {
      const r = magRadius(m);
      expect(r).toBeGreaterThanOrEqual(2);
      expect(r).toBeLessThanOrEqual(22);
    }
  });

  it('returns min for a non-finite magnitude (NaN guard)', () => {
    expect(magRadius(NaN)).toBe(2);
    expect(magRadius(NaN, { min: 4, max: 30 })).toBe(4);
  });
});

describe('niceTimeDomain', () => {
  it('extracts [min, max] time from quakes', () => {
    const quakes = [
      q('a', '2024-03-01T05:00:00Z'),
      q('b', '2024-03-01T01:00:00Z'),
      q('c', '2024-03-01T09:00:00Z'),
    ];
    const [lo, hi] = niceTimeDomain(quakes);
    expect(lo.toISOString()).toBe('2024-03-01T01:00:00.000Z');
    expect(hi.toISOString()).toBe('2024-03-01T09:00:00.000Z');
  });

  it('rounds endpoints outward to hour boundaries', () => {
    const quakes = [q('a', '2024-03-01T10:17:00Z'), q('b', '2024-03-01T11:42:00Z')];
    const [lo, hi] = niceTimeDomain(quakes);
    expect(lo.toISOString()).toBe('2024-03-01T10:00:00.000Z');
    expect(hi.toISOString()).toBe('2024-03-01T12:00:00.000Z');
  });

  it('leaves endpoints already on hour boundaries unchanged', () => {
    const quakes = [q('a', '2024-03-01T01:00:00Z'), q('b', '2024-03-01T09:00:00Z')];
    const [lo, hi] = niceTimeDomain(quakes);
    expect(lo.toISOString()).toBe('2024-03-01T01:00:00.000Z');
    expect(hi.toISOString()).toBe('2024-03-01T09:00:00.000Z');
  });

  it('returns a sensible ~24h default for empty input', () => {
    const [lo, hi] = niceTimeDomain([]);
    const span = hi.getTime() - lo.getTime();
    expect(span).toBe(24 * 60 * 60 * 1000);
  });
});

describe('magColorVar', () => {
  it('buckets by magnitude at boundaries into --c-1..--c-6', () => {
    expect(magColorVar(1.9)).toBe('var(--c-1)');
    expect(magColorVar(2)).toBe('var(--c-2)');
    expect(magColorVar(2.9)).toBe('var(--c-2)');
    expect(magColorVar(3)).toBe('var(--c-3)');
    expect(magColorVar(4)).toBe('var(--c-4)');
    expect(magColorVar(5)).toBe('var(--c-5)');
    expect(magColorVar(6)).toBe('var(--c-6)');
    expect(magColorVar(7.5)).toBe('var(--c-6)');
  });

  it('returns the least-severe color for a non-finite magnitude (NaN guard)', () => {
    expect(magColorVar(NaN)).toBe('var(--c-1)');
  });
});
