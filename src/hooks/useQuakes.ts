import { useQuery } from '@tanstack/react-query';
import { fetchQuakes } from '../lib/usgs';

export function useQuakes() {
  return useQuery({
    queryKey: ['quakes'],
    queryFn: fetchQuakes,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
