import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { ApiResponse, Garden, GardenCreate, GardenUpdate } from '@gardenvault/shared';

export function useGardens() {
  return useQuery({
    queryKey: queryKeys.gardens.all,
    queryFn: () => api.get<ApiResponse<Garden[]>>('/gardens'),
  });
}

export function useGarden(id: string | null) {
  return useQuery({
    queryKey: queryKeys.gardens.detail(id!),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.gardens.all });
    },
  });
}

export function useUpdateGarden() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: GardenUpdate }) =>
      api.patch<ApiResponse<Garden>>(`/gardens/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gardens.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.gardens.detail(variables.id) });
    },
  });
}

export function useGardenDeletionImpact(gardenId: string | null, enabled = false) {
  return useQuery({
    queryKey: queryKeys.gardens.deletionImpact(gardenId!),
    queryFn: () => api.get<ApiResponse<{ plots: number; sub_plots: number; plant_instances: number; harvests: number; soil_tests: number; notes: number }>>(`/gardens/${gardenId}/deletion-impact`),
    enabled: !!gardenId && enabled,
  });
}

export function useDeleteGarden() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/gardens/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gardens.all });
    },
  });
}
