import { describe, it, expect } from 'vitest';
import type { Quake } from '../types/quake';
import { geoTableRows } from './tableRows';

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

describe('geoTableRows', () => {
  it('sorts by descending magnitude', () => {
    const rows = geoTableRows(
      [q({ id: 'a', mag: 2 }), q({ id: 'b', mag: 5 }), q({ id: 'c', mag: 3 })],
      10,
    );
    expect(rows.map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('caps to the limit', () => {
    const input = [
      q({ id: 'a', mag: 1 }),
      q({ id: 'b', mag: 2 }),
      q({ id: 'c', mag: 3 }),
    ];
    const rows = geoTableRows(input, 2);
    expect(rows.map((r) => r.id)).toEqual(['c', 'b']);
  });

  it('does not mutate the input array', () => {
    const input = [q({ id: 'a', mag: 1 }), q({ id: 'b', mag: 9 })];
    const snapshot = input.map((r) => r.id);
    geoTableRows(input, 10);
    expect(input.map((r) => r.id)).toEqual(snapshot);
  });

  it('handles an empty feed and a zero/negative limit', () => {
    expect(geoTableRows([], 50)).toEqual([]);
    expect(geoTableRows([q({ id: 'a', mag: 4 })], 0)).toEqual([]);
    expect(geoTableRows([q({ id: 'a', mag: 4 })], -5)).toEqual([]);
  });
});
