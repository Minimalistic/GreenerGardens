import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { ApiResponse, PlantInstance, PlantInstanceCreate, PlantInstanceUpdate } from '@gardenvault/shared';

export function usePlantInstances() {
  return useQuery({
    queryKey: queryKeys.plantInstances.all,
    queryFn: () => api.get<ApiResponse<PlantInstance[]>>('/plant-instances'),
  });
}

export function usePlantInstance(id: string | null) {
  return useQuery({
    queryKey: queryKeys.plantInstances.detail(id!),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.plantInstances.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.subPlots.all });
    },
  });
}

export function useUpdatePlantStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch<ApiResponse<PlantInstance>>(`/plant-instances/${id}/status`, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plantInstances.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.plantInstances.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.subPlots.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.subPlots.allWithPlants });
    },
  });
}

export function useUpdatePlantHealth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, health }: { id: string; health: string }) =>
      api.patch<ApiResponse<PlantInstance>>(`/plant-instances/${id}/health`, { health }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plantInstances.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.subPlots.allWithPlants });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.plantInstances.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.subPlots.all });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
}

export function useUpdatePlantInstance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PlantInstanceUpdate> }) =>
      api.patch<ApiResponse<PlantInstance>>(`/plant-instances/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plantInstances.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.plantInstances.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.subPlots.allWithPlants });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

export function useDeletePlantInstance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/plant-instances/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plantInstances.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.subPlots.all });
    },
  });
}
