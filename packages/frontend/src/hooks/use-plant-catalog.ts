import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PlantCatalog, PaginatedResponse, ApiResponse } from '@gardenvault/shared';

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
