import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { ApiResponse, Harvest, HarvestCreate } from '@gardenvault/shared';

export function useHarvests() {
  return useQuery({
    queryKey: queryKeys.harvests.all,
    queryFn: () => api.get<ApiResponse<Harvest[]>>('/harvests'),
  });
}

export function useHarvestsByPlant(plantInstanceId: string | null) {
  return useQuery({
    queryKey: queryKeys.harvests.byPlant(plantInstanceId!),
    queryFn: () => api.get<ApiResponse<Harvest[]>>(`/harvests?plant_instance_id=${plantInstanceId}`),
    enabled: !!plantInstanceId,
  });
}

export function useCreateHarvest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: HarvestCreate) =>
      api.post<ApiResponse<Harvest>>('/harvests', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.harvests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.harvests.stats });
      queryClient.invalidateQueries({ queryKey: queryKeys.history.all });
    },
  });
}

export function useHarvestStats() {
  return useQuery({
    queryKey: queryKeys.harvests.stats,
    queryFn: () => api.get<ApiResponse<{
      total_harvests: number;
      total_weight_oz: number;
      unique_plants: number;
      this_season_count: number;
    }>>('/harvests/stats'),
  });
}

export function useDeleteHarvest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/harvests/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.harvests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.harvests.stats });
    },
  });
}
