import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface ResetResponse {
  success: boolean;
  data: { message: string };
}

interface SeedResponse {
  success: boolean;
  data: {
    message: string;
    summary: {
      gardens: number;
      plots: number;
      subPlots: number;
      plantInstances: number;
      harvests: number;
      notes: number;
      tasks: number;
      pestEvents: number;
      soilTests: number;
      seedInventory: number;
      conversations: number;
    };
  };
}

export function useResetDatabase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<ResetResponse>('/admin/reset-database', {}),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function useSeedTestData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<SeedResponse>('/admin/seed-test-data', {}),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
