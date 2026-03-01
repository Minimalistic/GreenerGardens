import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { HistoryLog } from '@gardenvault/shared';

interface HistoryResponse {
  success: true;
  data: HistoryLog[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export function useRecentActivity(limit: number = 20) {
  return useQuery({
    queryKey: ['history', 'recent', limit],
    queryFn: () => api.get<HistoryResponse>(`/history?limit=${limit}`),
  });
}

export interface HistoryFilters {
  entity_type?: string;
  action?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export function useFilteredHistory(filters: HistoryFilters) {
  const params = new URLSearchParams();
  if (filters.entity_type) params.set('entity_type', filters.entity_type);
  if (filters.action) params.set('action', filters.action);
  if (filters.start_date) params.set('start_date', filters.start_date);
  if (filters.end_date) params.set('end_date', filters.end_date);
  params.set('page', String(filters.page ?? 1));
  params.set('limit', String(filters.limit ?? 50));

  return useQuery({
    queryKey: ['history', 'filtered', filters],
    queryFn: () => api.get<HistoryResponse>(`/history?${params.toString()}`),
  });
}

export function useEntityHistory(entityType: string | null, entityId: string | null) {
  return useQuery({
    queryKey: ['history', entityType, entityId],
    queryFn: () => api.get<{ success: true; data: HistoryLog[] }>(`/history/${entityType}/${entityId}`),
    enabled: !!entityType && !!entityId,
  });
}
