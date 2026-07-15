import type { Quake } from '../types/quake';

// Drift-proof min/max over a non-empty array: the argument-spread form
// (`Math.min(...arr)`) throws RangeError on very large arrays.
function minOf(values: number[]): number {
  return values.reduce((a, b) => (a < b ? a : b));
}

function maxOf(values: number[]): number {
  return values.reduce((a, b) => (a > b ? a : b));
}

export interface Kpis {
  total: number;
  maxMag: number;
  avgDepth: number;
}

export function computeKpis(quakes: Quake[]): Kpis {
  if (quakes.length === 0) {
    return { total: 0, maxMag: 0, avgDepth: 0 };
  }
  const maxMag = maxOf(quakes.map((q) => q.mag));
  const avgDepthRaw = quakes.reduce((sum, q) => sum + q.depth, 0) / quakes.length;
  return {
    total: quakes.length,
    maxMag,
    avgDepth: Math.round(avgDepthRaw * 10) / 10,
  };
}

export interface TimeBin {
  t0: Date;
  t1: Date;
  count: number;
}

export function binByTime(quakes: Quake[], binMs: number): TimeBin[] {
  if (quakes.length === 0) {
    return [];
  }
  const times = quakes.map((q) => q.time.getTime());
  const min = minOf(times);
  const max = maxOf(times);
  const bins: TimeBin[] = [];
  for (let start = min; start <= max; start += binMs) {
    const end = start + binMs;
    const count = times.filter((t) => t >= start && t < end).length;
    bins.push({ t0: new Date(start), t1: new Date(end), count });
  }
  return bins;
}

export interface MagBin {
  x0: number;
  x1: number;
  count: number;
}

export function magnitudeHistogram(quakes: Quake[], step = 0.5): MagBin[] {
  if (quakes.length === 0) {
    return [];
  }
  const mags = quakes.map((q) => q.mag);
  const min = minOf(mags);
  const max = maxOf(mags);
  // Integer bucket indices avoid the float drift of accumulating `x0 += step`,
  // which can emit a stray/mis-labeled trailing bucket for a non-round min.
  const maxIndex = Math.floor((max - min) / step);
  const bins: MagBin[] = [];
  for (let i = 0; i <= maxIndex; i++) {
    bins.push({ x0: min + i * step, x1: min + (i + 1) * step, count: 0 });
  }
  for (const m of mags) {
    const index = Math.floor((m - min) / step);
    bins[index].count++;
  }
  return bins;
}

/**
 * Index of the time bin whose [t0, t1) interval contains `time`, or -1 if none.
 * Mirrors binByTime's half-open bucketing (inclusive start, exclusive end).
 */
export function timeBinIndexOf(bins: TimeBin[], time: Date): number {
  const t = time.getTime();
  return bins.findIndex((b) => t >= b.t0.getTime() && t < b.t1.getTime());
}

/**
 * Index of the magnitude bucket whose [x0, x1) interval contains `mag`, or -1 if
 * none. The final bucket is treated as closed on the right so a value equal to
 * the dataset maximum still lands in the last bucket (matching magnitudeHistogram).
 */
export function magBinIndexOf(bins: MagBin[], mag: number): number {
  for (let i = 0; i < bins.length; i++) {
    const b = bins[i];
    if (mag >= b.x0 && (mag < b.x1 || i === bins.length - 1)) {
      return i;
    }
  }
  return -1;
}

export function filterByRange(quakes: Quake[], range: [Date, Date] | null): Quake[] {
  if (range === null) {
    return quakes;
  }
  const [start, end] = range;
  const startMs = start.getTime();
  const endMs = end.getTime();
  return quakes.filter((q) => {
    const t = q.time.getTime();
    return t >= startMs && t < endMs;
  });
}
