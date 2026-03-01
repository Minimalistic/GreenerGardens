import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useCosts(options?: { category?: string }) {
  const params = new URLSearchParams();
  if (options?.category) params.set('category', options.category);
  const qs = params.toString();
  return useQuery({
    queryKey: ['costs', options],
    queryFn: () => api.get<{ data: any[] }>(`/costs${qs ? `?${qs}` : ''}`),
  });
}

export function useCostSummary(year?: number) {
  const qs = year ? `?year=${year}` : '';
  return useQuery({
    queryKey: ['costs', 'summary', year],
    queryFn: () => api.get<{ data: any[] }>(`/costs/summary${qs}`),
  });
}

export function useCostYearly() {
  return useQuery({
    queryKey: ['costs', 'yearly'],
    queryFn: () => api.get<{ data: any[] }>('/costs/yearly'),
  });
}

export function useCreateCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post<{ data: any }>('/costs', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['costs'] });
    },
  });
}

export function useUpdateCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch<{ data: any }>(`/costs/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['costs'] });
    },
  });
}

export function useDeleteCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/costs/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['costs'] });
    },
  });
}
