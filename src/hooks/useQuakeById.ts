import { useMemo } from 'react';
import { useQuakes } from './useQuakes';
import type { Quake } from '../types/quake';

/**
 * Look up a quake by id across the FULL (unfiltered) feed. Deliberately not
 * brush-filtered: a hovered or pinned quake must resolve even when the current
 * brush selection would exclude it, so cross-panel highlights and the pinned
 * detail card keep working regardless of the active time window.
 */
export function useQuakeById(id: string | null): Quake | null {
  const data = useQuakes().data;
  return useMemo(() => {
    if (id === null || data === undefined) {
      return null;
    }
    return data.find((q) => q.id === id) ?? null;
  }, [data, id]);
}
