import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useSeedInventory(options?: { expiring_soon?: boolean; low_quantity?: boolean }) {
  const params = new URLSearchParams();
  if (options?.expiring_soon) params.set('expiring_soon', 'true');
  if (options?.low_quantity) params.set('low_quantity', 'true');
  const qs = params.toString();
  return useQuery({
    queryKey: queryKeys.seedInventory.list(options),
    queryFn: () => api.get<{ data: any[] }>(`/seed-inventory${qs ? `?${qs}` : ''}`),
  });
}

export function useSeedInventoryById(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.seedInventory.detail(id!),
    queryFn: () => api.get<{ data: any }>(`/seed-inventory/${id}`),
    enabled: !!id,
  });
}

export function useCreateSeedInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post<{ data: any }>('/seed-inventory', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.seedInventory.all }); },
  });
}

export function useUpdateSeedInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch<{ data: any }>(`/seed-inventory/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.seedInventory.all }); },
  });
}

export function useDeleteSeedInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/seed-inventory/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.seedInventory.all }); },
  });
}

export function useDeductSeeds() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, count }: { id: string; count: number }) => api.post<{ data: any }>(`/seed-inventory/${id}/deduct`, { count }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.seedInventory.all }); },
  });
}
