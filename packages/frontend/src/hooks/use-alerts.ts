import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useActiveAlerts(gardenId: string | null) {
  return useQuery({
    queryKey: queryKeys.alerts.byGarden(gardenId!),
    queryFn: () => api.get<{ data: any[] }>(`/alerts?garden_id=${gardenId}`),
    enabled: !!gardenId,
    refetchInterval: 5 * 60 * 1000, // refetch every 5 min
  });
}

export function useCheckAlerts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (gardenId: string) => api.post<{ data: any }>(`/alerts/check?garden_id=${gardenId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}
