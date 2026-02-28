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

export function useDeleteGarden() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/gardens/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gardens'] });
    },
  });
}
