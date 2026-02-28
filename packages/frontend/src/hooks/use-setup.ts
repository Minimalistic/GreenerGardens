import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, SetupStatus, Garden, GardenCreate } from '@gardenvault/shared';

export function useSetupStatus() {
  return useQuery({
    queryKey: ['setup-status'],
    queryFn: () => api.get<ApiResponse<SetupStatus>>('/setup/status'),
  });
}

export function useCompleteSetup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GardenCreate) =>
      api.post<ApiResponse<Garden>>('/setup/garden', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setup-status'] });
      queryClient.invalidateQueries({ queryKey: ['gardens'] });
    },
  });
}
