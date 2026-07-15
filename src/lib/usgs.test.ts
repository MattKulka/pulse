import { describe, it, expect, vi, afterEach } from 'vitest';
import { normalizeQuakes, fetchQuakes, FEED_URL } from './usgs';

const fixture = {
  type: 'FeatureCollection',
  features: [
    {
      id: 'a1',
      properties: { mag: 4.2, time: 1_700_000_000_000, place: '10km N of Testville' },
      geometry: { coordinates: [-120.5, 38.1, 12.3] },
    },
    {
      id: 'a2',
      // mag is null -> should be filtered out
      properties: { mag: null, time: 1_700_000_500_000, place: 'Nowhere' },
      geometry: { coordinates: [-121.0, 39.0, 5.0] },
    },
    {
      id: 'a3',
      // place is null -> coerced to "Unknown location"
      properties: { mag: 1.1, time: 1_700_000_900_000, place: null },
      geometry: { coordinates: [100.2, -5.5, 33.0] },
    },
  ],
};

describe('normalizeQuakes', () => {
  it('filters out features with null mag', () => {
    const quakes = normalizeQuakes(fixture);
    expect(quakes).toHaveLength(2);
    expect(quakes.map((q) => q.id)).toEqual(['a1', 'a3']);
  });

  it('maps GeoJSON fields to Quake shape', () => {
    const [q] = normalizeQuakes(fixture);
    expect(q.id).toBe('a1');
    expect(q.mag).toBe(4.2);
    expect(q.lng).toBe(-120.5);
    expect(q.lat).toBe(38.1);
    expect(q.depth).toBe(12.3);
    expect(q.place).toBe('10km N of Testville');
    expect(q.time).toBeInstanceOf(Date);
    expect(q.time.getTime()).toBe(1_700_000_000_000);
  });

  it('coerces null place to "Unknown location"', () => {
    const quakes = normalizeQuakes(fixture);
    const a3 = quakes.find((q) => q.id === 'a3');
    expect(a3?.place).toBe('Unknown location');
  });
});

describe('fetchQuakes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws on a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 503 }) as Response),
    );
    await expect(fetchQuakes()).rejects.toThrow();
  });

  it('normalizes the fetched feed on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        expect(url).toBe(FEED_URL);
        return { ok: true, json: async () => fixture } as unknown as Response;
      }),
    );
    const quakes = await fetchQuakes();
    expect(quakes).toHaveLength(2);
  });
});
