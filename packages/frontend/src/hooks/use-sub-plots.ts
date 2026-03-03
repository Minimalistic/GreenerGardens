import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, SubPlot, SubPlotCreate, SubPlotUpdate } from '@gardenvault/shared';

export interface SubPlotWithPlant extends SubPlot {
  plant_name: string | null;
  plant_catalog_id: string | null;
  variety_name: string | null;
  status: string | null;
  health: string | null;
  date_planted: string | null;
  expected_harvest_date: string | null;
  planting_method: string | null;
}

export function useSubPlotsByPlot(plotId: string | null) {
  return useQuery({
    queryKey: ['sub-plots', plotId],
    queryFn: () => api.get<ApiResponse<SubPlot[]>>(`/plots/${plotId}/sub-plots`),
    enabled: !!plotId,
  });
}

export function useSubPlotsWithPlants(plotId: string | null) {
  return useQuery({
    queryKey: ['sub-plots-with-plants', plotId],
    queryFn: () => api.get<ApiResponse<SubPlotWithPlant[]>>(`/plots/${plotId}/sub-plots-with-plants`),
    enabled: !!plotId,
  });
}

/** Batch-fetch sub-plots for multiple plots at once (for canvas overlay). */
export function useSubPlotsForPlots(plotIds: string[]) {
  return useQueries({
    queries: plotIds.map((id) => ({
      queryKey: ['sub-plots', id],
      queryFn: () => api.get<ApiResponse<SubPlot[]>>(`/plots/${id}/sub-plots`),
      staleTime: 30_000,
    })),
  });
}

export function useSubPlot(id: string | null) {
  return useQuery({
    queryKey: ['sub-plot', id],
    queryFn: () => api.get<ApiResponse<SubPlot>>(`/sub-plots/${id}`),
    enabled: !!id,
  });
}

export function useCreateSubPlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SubPlotCreate) =>
      api.post<ApiResponse<SubPlot>>('/sub-plots', data),
    onSuccess: (result) => {
      const plotId = result?.data?.plot_id;
      if (plotId) {
        queryClient.invalidateQueries({ queryKey: ['sub-plots', plotId] });
        queryClient.invalidateQueries({ queryKey: ['sub-plots-with-plants', plotId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['sub-plots'] });
        queryClient.invalidateQueries({ queryKey: ['sub-plots-with-plants'] });
      }
    },
  });
}

export function useUpdateSubPlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SubPlotUpdate }) =>
      api.patch<ApiResponse<SubPlot>>(`/sub-plots/${id}`, data),
    onSuccess: (result) => {
      const plotId = result?.data?.plot_id;
      if (plotId) {
        queryClient.invalidateQueries({ queryKey: ['sub-plots', plotId] });
        queryClient.invalidateQueries({ queryKey: ['sub-plots-with-plants', plotId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['sub-plots'] });
        queryClient.invalidateQueries({ queryKey: ['sub-plots-with-plants'] });
      }
    },
  });
}

export function useDeleteSubPlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, plotId }: { id: string; plotId: string }) => api.delete(`/sub-plots/${id}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sub-plots', variables.plotId] });
      queryClient.invalidateQueries({ queryKey: ['sub-plots-with-plants', variables.plotId] });
    },
  });
}
