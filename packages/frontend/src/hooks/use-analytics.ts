import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useHarvestAnalytics(groupBy: 'plant' | 'plot' | 'month' = 'plant', year?: number) {
  const params = new URLSearchParams();
  params.set('groupBy', groupBy);
  if (year) params.set('year', String(year));
  return useQuery({
    queryKey: ['analytics', 'harvests', groupBy, year],
    queryFn: () => api.get<{ data: any[] }>(`/analytics/harvests?${params}`),
  });
}

export function useDestinationBreakdown(year?: number) {
  const qs = year ? `?year=${year}` : '';
  return useQuery({
    queryKey: ['analytics', 'destinations', year],
    queryFn: () => api.get<{ data: any[] }>(`/analytics/harvests/destinations${qs}`),
  });
}

export function useYearOverYear() {
  return useQuery({
    queryKey: ['analytics', 'year-over-year'],
    queryFn: () => api.get<{ data: any[] }>('/analytics/harvests/compare'),
  });
}
