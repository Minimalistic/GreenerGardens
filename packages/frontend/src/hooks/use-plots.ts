import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { ApiResponse, Plot, PlotCreate, PlotUpdate } from '@gardenvault/shared';

export function usePlotsByGarden(gardenId: string | null) {
  return useQuery({
    queryKey: queryKeys.plots.byGarden(gardenId!),
    queryFn: () => api.get<ApiResponse<Plot[]>>(`/gardens/${gardenId}/plots`),
    enabled: !!gardenId,
  });
}

export function usePlot(id: string | null) {
  return useQuery({
    queryKey: queryKeys.plots.detail(id!),
    queryFn: () => api.get<ApiResponse<Plot>>(`/plots/${id}`),
    enabled: !!id,
  });
}

export function useCreatePlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PlotCreate) =>
      api.post<ApiResponse<Plot>>('/plots', data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plots.byGarden(variables.garden_id) });
    },
  });
}

export function useUpdatePlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PlotUpdate }) =>
      api.patch<ApiResponse<Plot>>(`/plots/${id}`, data),
    onSuccess: (result, variables) => {
      const gardenId = result?.data?.garden_id;
      if (gardenId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.plots.byGarden(gardenId) });
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.plots.all });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.plots.detail(variables.id) });
    },
  });
}

export function usePlotDeletionImpact(plotId: string | null, enabled = false) {
  return useQuery({
    queryKey: queryKeys.plots.deletionImpact(plotId!),
    queryFn: () => api.get<ApiResponse<{ sub_plots: number; plant_instances: number; harvests: number; soil_tests: number; notes: number }>>(`/plots/${plotId}/deletion-impact`),
    enabled: !!plotId && enabled,
  });
}

export function useDeletePlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, gardenId }: { id: string; gardenId: string }) => api.delete(`/plots/${id}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plots.byGarden(variables.gardenId) });
    },
  });
}
