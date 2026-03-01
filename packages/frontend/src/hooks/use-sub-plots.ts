import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, SubPlot, SubPlotCreate, SubPlotUpdate } from '@gardenvault/shared';

export interface SubPlotWithPlant extends SubPlot {
  plant_name: string | null;
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-plots'] });
      queryClient.invalidateQueries({ queryKey: ['sub-plots-with-plants'] });
    },
  });
}

export function useUpdateSubPlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SubPlotUpdate }) =>
      api.patch<ApiResponse<SubPlot>>(`/sub-plots/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-plots'] });
      queryClient.invalidateQueries({ queryKey: ['sub-plots-with-plants'] });
    },
  });
}

export function useDeleteSubPlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/sub-plots/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-plots'] });
      queryClient.invalidateQueries({ queryKey: ['sub-plots-with-plants'] });
    },
  });
}
