import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { feature } from 'topojson-client'
import type { FeatureCollection, GeometryObject } from 'geojson'
import type { Topology, GeometryCollection } from 'topojson-specification'

/**
 * The land-110m atlas is a Topology whose single `land` object is a
 * GeometryCollection. Narrowing `objects.land` to that shape lets `feature()`
 * return a typed GeoJSON FeatureCollection without resorting to `any`.
 */
interface LandTopology extends Topology {
  objects: { land: GeometryCollection }
}

async function fetchLand(): Promise<FeatureCollection<GeometryObject>> {
  const res = await fetch('/land-110m.json')
  if (!res.ok) {
    throw new Error(`Land topojson request failed: ${res.status}`)
  }
  const topology = (await res.json()) as LandTopology
  // A GeometryCollection object yields a FeatureCollection from feature().
  return feature(topology, topology.objects.land)
}

/**
 * Fetch + parse the bundled world land TopoJSON into a GeoJSON feature
 * collection. It is a static asset, so it is cached forever (never
 * refetched/garbage-collected).
 */
export function useLandFeature(): UseQueryResult<
  FeatureCollection<GeometryObject>
> {
  return useQuery({
    queryKey: ['land'],
    queryFn: fetchLand,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
