import { describe, it, expect } from 'vitest';
import type { Quake } from '../types/quake';
import { sortQuakes } from './sortQuakes';

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

describe('sortQuakes', () => {
  it('sorts by descending magnitude by default order', () => {
    const rows = sortQuakes(
      [q({ id: 'a', mag: 2 }), q({ id: 'b', mag: 5 }), q({ id: 'c', mag: 3 })],
      'magnitude',
    );
    expect(rows.map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('sorts by descending time in recent mode', () => {
    const rows = sortQuakes(
      [
        q({ id: 'a', time: new Date('2024-01-01T01:00:00Z') }),
        q({ id: 'b', time: new Date('2024-01-01T03:00:00Z') }),
        q({ id: 'c', time: new Date('2024-01-01T02:00:00Z') }),
      ],
      'recent',
    );
    expect(rows.map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('is stable for magnitude ties (keeps input order)', () => {
    const rows = sortQuakes(
      [
        q({ id: 'a', mag: 4 }),
        q({ id: 'b', mag: 4 }),
        q({ id: 'c', mag: 4 }),
      ],
      'magnitude',
    );
    expect(rows.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('is stable for time ties (keeps input order)', () => {
    const t = new Date('2024-01-01T05:00:00Z');
    const rows = sortQuakes(
      [q({ id: 'a', time: t }), q({ id: 'b', time: t }), q({ id: 'c', time: t })],
      'recent',
    );
    expect(rows.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('sorts non-finite magnitudes to the bottom', () => {
    const rows = sortQuakes(
      [q({ id: 'a', mag: NaN }), q({ id: 'b', mag: 5 }), q({ id: 'c', mag: 2 })],
      'magnitude',
    );
    expect(rows.map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('does not mutate the input array', () => {
    const input = [q({ id: 'a', mag: 1 }), q({ id: 'b', mag: 9 })];
    const snapshot = input.map((r) => r.id);
    sortQuakes(input, 'magnitude');
    expect(input.map((r) => r.id)).toEqual(snapshot);
  });
});
