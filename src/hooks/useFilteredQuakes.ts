import { useMemo } from 'react';
import { useVisibleQuakes } from './useVisibleQuakes';
import { useUiStore } from '../store/uiStore';
import { filterByRange } from '../lib/transforms';
import type { Quake } from '../types/quake';

/**
 * Single source of truth for the quakes the histogram, map and KPIs consume:
 * the visible quakes (legend series filtering) narrowed to the active brush
 * range. Composed as `visible ∩ brush` — series visibility and the brush are
 * kept as separate, orthogonal dimensions.
 */
export function useFilteredQuakes(): Quake[] {
  const visible = useVisibleQuakes();
  const brushRange = useUiStore((s) => s.brushRange);
  return useMemo(
    () => filterByRange(visible, brushRange),
    [visible, brushRange],
  );
}
