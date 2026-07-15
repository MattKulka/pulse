import type { Quake } from '../types/quake';

export interface Kpis {
  total: number;
  maxMag: number;
  avgDepth: number;
}

export function computeKpis(quakes: Quake[]): Kpis {
  if (quakes.length === 0) {
    return { total: 0, maxMag: 0, avgDepth: 0 };
  }
  const maxMag = Math.max(...quakes.map((q) => q.mag));
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
  const min = Math.min(...times);
  const max = Math.max(...times);
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
  const min = Math.min(...mags);
  const max = Math.max(...mags);
  const bins: MagBin[] = [];
  for (let x0 = min; x0 <= max; x0 += step) {
    const x1 = x0 + step;
    const count = mags.filter((m) => m >= x0 && m < x1).length;
    bins.push({ x0, x1, count });
  }
  return bins;
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
