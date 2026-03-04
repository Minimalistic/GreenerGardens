import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useHarvestAnalytics(groupBy: 'plant' | 'plot' | 'month' = 'plant', year?: number) {
  const params = new URLSearchParams();
  params.set('groupBy', groupBy);
  if (year) params.set('year', String(year));
  return useQuery({
    queryKey: queryKeys.analytics.harvests(groupBy, year),
    queryFn: () => api.get<{ data: any[] }>(`/analytics/harvests?${params}`),
  });
}

export function useDestinationBreakdown(year?: number) {
  const qs = year ? `?year=${year}` : '';
  return useQuery({
    queryKey: queryKeys.analytics.destinations(year),
    queryFn: () => api.get<{ data: any[] }>(`/analytics/harvests/destinations${qs}`),
  });
}

export function useYearOverYear() {
  return useQuery({
    queryKey: queryKeys.analytics.yearOverYear,
    queryFn: () => api.get<{ data: any[] }>('/analytics/harvests/compare'),
  });
}
