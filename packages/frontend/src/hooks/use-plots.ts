import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, Plot, PlotCreate, PlotUpdate } from '@gardenvault/shared';

export function usePlotsByGarden(gardenId: string | null) {
  return useQuery({
    queryKey: ['plots', gardenId],
    queryFn: () => api.get<ApiResponse<Plot[]>>(`/gardens/${gardenId}/plots`),
    enabled: !!gardenId,
  });
}

export function usePlot(id: string | null) {
  return useQuery({
    queryKey: ['plot', id],
    queryFn: () => api.get<ApiResponse<Plot>>(`/plots/${id}`),
    enabled: !!id,
  });
}

export function useCreatePlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PlotCreate) =>
      api.post<ApiResponse<Plot>>('/plots', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plots'] });
    },
  });
}

export function useUpdatePlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PlotUpdate }) =>
      api.patch<ApiResponse<Plot>>(`/plots/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plots'] });
      queryClient.invalidateQueries({ queryKey: ['plot', variables.id] });
    },
  });
}

export function useDeletePlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/plots/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plots'] });
    },
  });
}
