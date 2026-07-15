import { useMemo } from 'react';
import { useQuakes } from './useQuakes';
import { useUiStore } from '../store/uiStore';
import { magBucketKey } from '../lib/scales';
import type { Quake } from '../types/quake';

/**
 * The fetched quakes minus any whose magnitude bucket is hidden via the legend.
 * This is the "series visibility" dimension ONLY — it deliberately does NOT
 * apply the brush. The time-series chart consumes this (so hiding a series
 * lowers its bars while keeping the full 24h context for brushing); everything
 * that should also respect the brush layers useFilteredQuakes on top.
 */
export function useVisibleQuakes(): Quake[] {
  const data = useQuakes().data;
  const hiddenSeries = useUiStore((s) => s.hiddenSeries);
  return useMemo(() => {
    const all = data ?? [];
    if (hiddenSeries.size === 0) {
      return all;
    }
    return all.filter((q) => !hiddenSeries.has(magBucketKey(q.mag)));
  }, [data, hiddenSeries]);
}
