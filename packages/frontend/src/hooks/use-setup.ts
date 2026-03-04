import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { ApiResponse, SetupStatus, Garden, GardenCreate } from '@gardenvault/shared';

export function useSetupStatus() {
  return useQuery({
    queryKey: queryKeys.setup.status,
    queryFn: () => api.get<ApiResponse<SetupStatus>>('/setup/status'),
  });
}

export function useCompleteSetup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GardenCreate) =>
      api.post<ApiResponse<Garden>>('/setup/garden', data),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.setup.status, {
        success: true,
        data: { is_setup_complete: true, garden_count: 1 },
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.gardens.all });
    },
  });
}
