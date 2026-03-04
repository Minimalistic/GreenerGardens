import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, Garden, GardenCreate, GardenUpdate } from '@gardenvault/shared';

export function useGardens() {
  return useQuery({
    queryKey: ['gardens'],
    queryFn: () => api.get<ApiResponse<Garden[]>>('/gardens'),
  });
}

export function useGarden(id: string | null) {
  return useQuery({
    queryKey: ['garden', id],
    queryFn: () => api.get<ApiResponse<Garden>>(`/gardens/${id}`),
    enabled: !!id,
  });
}

export function useCreateGarden() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GardenCreate) =>
      api.post<ApiResponse<Garden>>('/gardens', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gardens'] });
    },
  });
}

export function useUpdateGarden() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: GardenUpdate }) =>
      api.patch<ApiResponse<Garden>>(`/gardens/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gardens'] });
      queryClient.invalidateQueries({ queryKey: ['garden', variables.id] });
    },
  });
}

export function useGardenDeletionImpact(gardenId: string | null, enabled = false) {
  return useQuery({
    queryKey: ['garden-deletion-impact', gardenId],
    queryFn: () => api.get<ApiResponse<{ plots: number; sub_plots: number; plant_instances: number; harvests: number; soil_tests: number; notes: number }>>(`/gardens/${gardenId}/deletion-impact`),
    enabled: !!gardenId && enabled,
  });
}

export function useDeleteGarden() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/gardens/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gardens'] });
      queryClient.invalidateQueries({ queryKey: ['plots'] });
      queryClient.invalidateQueries({ queryKey: ['sub-plots'] });
      queryClient.invalidateQueries({ queryKey: ['sub-plots-with-plants'] });
      queryClient.invalidateQueries({ queryKey: ['plant-instances'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['harvests'] });
      queryClient.invalidateQueries({ queryKey: ['harvest-stats'] });
      queryClient.invalidateQueries({ queryKey: ['soil-tests'] });
      queryClient.invalidateQueries({ queryKey: ['pest-events'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });
}
