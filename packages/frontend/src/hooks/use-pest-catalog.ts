import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PestCatalog, PestCatalogCreate, PaginatedResponse, ApiResponse } from '@gardenvault/shared';

interface PestCatalogSearchParams {
  search?: string;
  category?: string;
  severity?: string;
  affected_plant?: string;
  page?: number;
  limit?: number;
}

export function usePestCatalogSearch(params: PestCatalogSearchParams) {
  const queryParams = new URLSearchParams();
  if (params.search) queryParams.set('search', params.search);
  if (params.category) queryParams.set('category', params.category);
  if (params.severity) queryParams.set('severity', params.severity);
  if (params.affected_plant) queryParams.set('affected_plant', params.affected_plant);
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));

  const qs = queryParams.toString();
  return useQuery({
    queryKey: ['pest-catalog', params],
    queryFn: () =>
      api.get<PaginatedResponse<PestCatalog>>(`/pest-catalog${qs ? `?${qs}` : ''}`),
  });
}

export function usePestCatalogEntry(id: string | null) {
  return useQuery({
    queryKey: ['pest-catalog', id],
    queryFn: () => api.get<ApiResponse<PestCatalog>>(`/pest-catalog/${id}`),
    enabled: !!id,
  });
}

export function useCreatePestCatalogEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PestCatalogCreate) =>
      api.post<ApiResponse<PestCatalog>>('/pest-catalog', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pest-catalog'] });
    },
  });
}

export function useUpdatePestCatalogEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PestCatalogCreate> }) =>
      api.patch<ApiResponse<PestCatalog>>(`/pest-catalog/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pest-catalog'] });
    },
  });
}

export function useDeletePestCatalogEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/pest-catalog/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pest-catalog'] });
    },
  });
}
