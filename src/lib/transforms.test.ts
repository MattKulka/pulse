import { describe, it, expect } from 'vitest';
import type { Quake } from '../types/quake';
import {
  computeKpis,
  binByTime,
  magnitudeHistogram,
  filterByRange,
  timeBinIndexOf,
  magBinIndexOf,
} from './transforms';

function q(partial: Partial<Quake> & { id: string }): Quake {
  return {
    time: new Date('2024-01-01T00:00:00Z'),
    mag: 1,
    depth: 10,
    lat: 0,
    lng: 0,
    place: 'x',
    ...partial,
  };
}

const fixture: Quake[] = [
  q({ id: '1', time: new Date('2024-01-01T00:00:00Z'), mag: 2.0, depth: 10 }),
  q({ id: '2', time: new Date('2024-01-01T00:30:00Z'), mag: 5.0, depth: 20 }),
  q({ id: '3', time: new Date('2024-01-01T02:30:00Z'), mag: 3.5, depth: 30 }),
];

describe('computeKpis', () => {
  it('computes total, maxMag, and avgDepth rounded to 1 decimal', () => {
    expect(computeKpis(fixture)).toEqual({ total: 3, maxMag: 5.0, avgDepth: 20 });
  });

  it('rounds avgDepth to one decimal place', () => {
    const quakes = [q({ id: 'a', depth: 10 }), q({ id: 'b', depth: 15 }), q({ id: 'c', depth: 12 })];
    // (10 + 15 + 12) / 3 = 12.333... -> 12.3
    expect(computeKpis(quakes).avgDepth).toBe(12.3);
  });

  it('returns zeros for an empty array', () => {
    expect(computeKpis([])).toEqual({ total: 0, maxMag: 0, avgDepth: 0 });
  });
});

describe('binByTime', () => {
  it('returns [] for empty input', () => {
    expect(binByTime([], 60 * 60 * 1000)).toEqual([]);
  });

  it('spans the full min->max range including zero-count bins, sorted ascending', () => {
    const hour = 60 * 60 * 1000;
    const bins = binByTime(fixture, hour);
    // range 00:00 -> 02:30 with 1h bins => 3 bins: [00-01), [01-02), [02-03)
    expect(bins).toHaveLength(3);
    expect(bins[0].count).toBe(2); // 00:00 and 00:30
    expect(bins[1].count).toBe(0); // empty hour
    expect(bins[2].count).toBe(1); // 02:30
    expect(bins[0].t0.getTime()).toBeLessThan(bins[1].t0.getTime());
    expect(bins[1].t0.getTime()).toBeLessThan(bins[2].t0.getTime());
    expect(bins[0].t1.getTime()).toBe(bins[1].t0.getTime());
  });
});

describe('magnitudeHistogram', () => {
  it('buckets magnitudes over min->max in step-sized buckets', () => {
    const hist = magnitudeHistogram(fixture, 0.5);
    // min 2.0, max 5.0 -> buckets [2.0,2.5),[2.5,3.0)...[5.0,5.5) => 7 buckets
    expect(hist).toHaveLength(7);
    expect(hist[0]).toMatchObject({ x0: 2.0, x1: 2.5, count: 1 });
    expect(hist[hist.length - 1]).toMatchObject({ x0: 5.0, x1: 5.5, count: 1 });
    const totalCount = hist.reduce((s, b) => s + b.count, 0);
    expect(totalCount).toBe(3);
  });

  it('returns [] for empty input', () => {
    expect(magnitudeHistogram([], 0.5)).toEqual([]);
  });

  it('buckets a non-round min without float drift or a stray empty trailing bucket', () => {
    // min 1.1: float accumulation (x0 += step) drifts and emits a stray empty
    // trailing bucket; integer indexing must not.
    const quakes = [
      q({ id: 'a', mag: 1.1 }),
      q({ id: 'b', mag: 2.1 }),
      q({ id: 'c', mag: 3.1 }),
      q({ id: 'd', mag: 4.1 }),
    ];
    const hist = magnitudeHistogram(quakes, 0.5);
    expect(hist).toHaveLength(6);
    expect(hist.map((b) => b.count)).toEqual([1, 0, 1, 0, 1, 1]);
    // last bucket holds the max value, it is not a stray empty bucket
    expect(hist[hist.length - 1].count).toBe(1);
    expect(hist[0].x0).toBeCloseTo(1.1, 10);
    expect(hist[0].x1).toBeCloseTo(1.6, 10);
    expect(hist[hist.length - 1].x0).toBeCloseTo(3.6, 10);
    expect(hist[hist.length - 1].x1).toBeCloseTo(4.1, 10);
  });
});

describe('timeBinIndexOf', () => {
  const hour = 60 * 60 * 1000;
  const bins = binByTime(fixture, hour); // [00-01), [01-02), [02-03)

  it('finds the bin containing a time (inclusive start)', () => {
    expect(timeBinIndexOf(bins, new Date('2024-01-01T00:00:00Z'))).toBe(0);
    expect(timeBinIndexOf(bins, new Date('2024-01-01T00:30:00Z'))).toBe(0);
    expect(timeBinIndexOf(bins, new Date('2024-01-01T02:30:00Z'))).toBe(2);
  });

  it('returns -1 when no bin contains the time', () => {
    expect(timeBinIndexOf(bins, new Date('2023-12-31T00:00:00Z'))).toBe(-1);
    // exactly the exclusive end of the last bin falls outside
    expect(timeBinIndexOf(bins, new Date('2024-01-01T03:00:00Z'))).toBe(-1);
  });
});

describe('magBinIndexOf', () => {
  const bins = magnitudeHistogram(fixture, 0.5); // [2.0,2.5)...[5.0,5.5)

  it('finds the bucket containing a magnitude (inclusive start)', () => {
    expect(magBinIndexOf(bins, 2.0)).toBe(0);
    expect(magBinIndexOf(bins, 3.5)).toBe(3);
    expect(magBinIndexOf(bins, 5.0)).toBe(6);
  });

  it('treats the final bucket as closed on the right so the max lands in it', () => {
    // exact upper edge of the dataset max stays in the last bucket
    expect(magBinIndexOf(bins, 5.5)).toBe(6);
  });

  it('returns -1 for a magnitude below the first bucket', () => {
    expect(magBinIndexOf(bins, 1.0)).toBe(-1);
  });
});

describe('filterByRange', () => {
  it('returns all quakes when range is null', () => {
    expect(filterByRange(fixture, null)).toEqual(fixture);
  });

  it('is inclusive-start, exclusive-end', () => {
    const range: [Date, Date] = [
      new Date('2024-01-01T00:00:00Z'),
      new Date('2024-01-01T02:30:00Z'),
    ];
    const result = filterByRange(fixture, range);
    // includes 00:00 and 00:30, excludes 02:30 (end is exclusive)
    expect(result.map((r) => r.id)).toEqual(['1', '2']);
  });
});
