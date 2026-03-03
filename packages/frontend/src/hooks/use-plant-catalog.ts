import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PlantCatalog, PlantCatalogCreate, PaginatedResponse, ApiResponse } from '@gardenvault/shared';

interface CatalogSearchParams {
  search?: string;
  plant_type?: string;
  lifecycle?: string;
  sun_exposure?: string;
  water_needs?: string;
  page?: number;
  limit?: number;
}

export function usePlantCatalogSearch(params: CatalogSearchParams) {
  const queryParams = new URLSearchParams();
  if (params.search) queryParams.set('search', params.search);
  if (params.plant_type) queryParams.set('plant_type', params.plant_type);
  if (params.lifecycle) queryParams.set('lifecycle', params.lifecycle);
  if (params.sun_exposure) queryParams.set('sun_exposure', params.sun_exposure);
  if (params.water_needs) queryParams.set('water_needs', params.water_needs);
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));

  const qs = queryParams.toString();
  return useQuery({
    queryKey: ['plant-catalog', params],
    queryFn: () =>
      api.get<PaginatedResponse<PlantCatalog>>(`/plant-catalog${qs ? `?${qs}` : ''}`),
  });
}

export function usePlantCatalogEntry(id: string | null) {
  return useQuery({
    queryKey: ['plant-catalog', id],
    queryFn: () => api.get<ApiResponse<PlantCatalog>>(`/plant-catalog/${id}`),
    enabled: !!id,
  });
}

export function useCreatePlantCatalogEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PlantCatalogCreate) =>
      api.post<ApiResponse<PlantCatalog>>('/plant-catalog', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plant-catalog'] });
    },
  });
}

export function useUpdatePlantCatalogEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PlantCatalogCreate> }) =>
      api.patch<ApiResponse<PlantCatalog>>(`/plant-catalog/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plant-catalog'] });
    },
  });
}

export interface PlantCatalogActivity {
  counts: {
    plantings: number;
    harvests: number;
    tasks: number;
    pest_events: number;
    seeds: number;
  };
  plantings: Array<{
    id: string;
    variety_name: string | null;
    status: string;
    date_planted: string | null;
    quantity: number;
    plot_name: string;
  }>;
  harvests: Array<{
    id: string;
    plant_instance_id: string;
    date_harvested: string;
    quantity: number;
    unit: string;
    quality: string;
    variety_name: string | null;
    plot_name: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    due_date: string | null;
    entity_id: string;
  }>;
  pest_events: Array<{
    id: string;
    pest_name: string;
    severity: string;
    outcome: string;
    detected_date: string;
    entity_id: string;
  }>;
  seeds: Array<{
    id: string;
    variety_name: string;
    brand: string | null;
    quantity_packets: number;
    quantity_seeds_approx: number | null;
    expiration_date: string | null;
  }>;
}

export function usePlantCatalogActivity(id: string | null) {
  return useQuery({
    queryKey: ['plant-catalog', id, 'activity'],
    queryFn: () => api.get<ApiResponse<PlantCatalogActivity>>(`/plant-catalog/${id}/activity`),
    enabled: !!id,
  });
}

export function useDeletePlantCatalogEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/plant-catalog/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plant-catalog'] });
    },
  });
}
