import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, SubPlot, SubPlotUpdate } from '@gardenvault/shared';

export function useSubPlotsByPlot(plotId: string | null) {
  return useQuery({
    queryKey: ['sub-plots', plotId],
    queryFn: () => api.get<ApiResponse<SubPlot[]>>(`/plots/${plotId}/sub-plots`),
    enabled: !!plotId,
  });
}

export function useSubPlot(id: string | null) {
  return useQuery({
    queryKey: ['sub-plot', id],
    queryFn: () => api.get<ApiResponse<SubPlot>>(`/sub-plots/${id}`),
    enabled: !!id,
  });
}

export function useUpdateSubPlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SubPlotUpdate }) =>
      api.patch<ApiResponse<SubPlot>>(`/sub-plots/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-plots'] });
    },
  });
}
