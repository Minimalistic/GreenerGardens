import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, PlantInstance, PlantInstanceCreate, PlantInstanceUpdate } from '@gardenvault/shared';

export function usePlantInstances() {
  return useQuery({
    queryKey: ['plant-instances'],
    queryFn: () => api.get<ApiResponse<PlantInstance[]>>('/plant-instances'),
  });
}

export function usePlantInstance(id: string | null) {
  return useQuery({
    queryKey: ['plant-instance', id],
    queryFn: () => api.get<ApiResponse<PlantInstance>>(`/plant-instances/${id}`),
    enabled: !!id,
  });
}

export function useCreatePlantInstance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PlantInstanceCreate) =>
      api.post<ApiResponse<PlantInstance>>('/plant-instances', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plant-instances'] });
      queryClient.invalidateQueries({ queryKey: ['sub-plots'] });
    },
  });
}

export function useUpdatePlantStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch<ApiResponse<PlantInstance>>(`/plant-instances/${id}/status`, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plant-instances'] });
      queryClient.invalidateQueries({ queryKey: ['plant-instance', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['sub-plots'] });
    },
  });
}

export function useUpdatePlantHealth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, health }: { id: string; health: string }) =>
      api.patch<ApiResponse<PlantInstance>>(`/plant-instances/${id}/health`, { health }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plant-instance', variables.id] });
    },
  });
}

export function useCreateSuccessionPlanting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      plant_catalog_id: string;
      plot_id: string;
      start_date: string;
      interval_days: number;
      count: number;
      planting_method?: string;
      sub_plot_id?: string;
    }) => api.post<ApiResponse<PlantInstance[]>>('/plant-instances/succession', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plant-instances'] });
      queryClient.invalidateQueries({ queryKey: ['sub-plots'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
}

export function useDeletePlantInstance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/plant-instances/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plant-instances'] });
      queryClient.invalidateQueries({ queryKey: ['sub-plots'] });
    },
  });
}
