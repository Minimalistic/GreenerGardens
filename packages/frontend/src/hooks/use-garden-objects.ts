import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, GardenObject, GardenObjectCreate, GardenObjectUpdate } from '@gardenvault/shared';

export function useGardenObjects(gardenId: string | null) {
  return useQuery({
    queryKey: ['garden-objects', gardenId],
    queryFn: () => api.get<ApiResponse<GardenObject[]>>(`/gardens/${gardenId}/objects`),
    enabled: !!gardenId,
  });
}

export function useCreateGardenObject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GardenObjectCreate) =>
      api.post<ApiResponse<GardenObject>>('/garden-objects', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['garden-objects', variables.garden_id] });
    },
  });
}

export function useUpdateGardenObject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, gardenId }: { id: string; data: GardenObjectUpdate; gardenId: string }) =>
      api.patch<ApiResponse<GardenObject>>(`/garden-objects/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['garden-objects', variables.gardenId] });
    },
  });
}

export function useDeleteGardenObject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, gardenId }: { id: string; gardenId: string }) =>
      api.delete(`/garden-objects/${id}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['garden-objects', variables.gardenId] });
    },
  });
}
