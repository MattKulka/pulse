import type { Quake } from '../types/quake';

export const FEED_URL =
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';

interface UsgsFeature {
  id: string;
  properties: { mag: number | null; time: number; place: string | null };
  geometry: { coordinates: number[] };
}

interface UsgsFeed {
  features: UsgsFeature[];
}

export function normalizeQuakes(json: UsgsFeed): Quake[] {
  return json.features
    .filter((f): f is UsgsFeature & { properties: { mag: number } } => f.properties.mag !== null)
    .map((f) => {
      const [lng, lat, depth] = f.geometry.coordinates;
      return {
        id: f.id,
        time: new Date(f.properties.time),
        mag: f.properties.mag,
        depth,
        lat,
        lng,
        place: f.properties.place ?? 'Unknown location',
      };
    });
}

export async function fetchQuakes(): Promise<Quake[]> {
  const res = await fetch(FEED_URL);
  if (!res.ok) {
    throw new Error(`USGS feed request failed: ${res.status}`);
  }
  return normalizeQuakes((await res.json()) as UsgsFeed);
}
