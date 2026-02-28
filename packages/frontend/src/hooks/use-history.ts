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

export function useEntityHistory(entityType: string | null, entityId: string | null) {
  return useQuery({
    queryKey: ['history', entityType, entityId],
    queryFn: () => api.get<{ success: true; data: HistoryLog[] }>(`/history/${entityType}/${entityId}`),
    enabled: !!entityType && !!entityId,
  });
}
