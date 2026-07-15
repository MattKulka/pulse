import { useMemo } from 'react';
import { useQuakes } from './useQuakes';
import { useUiStore } from '../store/uiStore';
import { filterByRange } from '../lib/transforms';
import type { Quake } from '../types/quake';

/**
 * Single source of truth for the quakes all panels/KPIs consume: the fetched
 * quakes narrowed to the store's active brush range (all quakes when null).
 */
export function useFilteredQuakes(): Quake[] {
  const data = useQuakes().data;
  const brushRange = useUiStore((s) => s.brushRange);
  return useMemo(() => filterByRange(data ?? [], brushRange), [data, brushRange]);
}
