import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SeedInventory, SeedInventoryCreate, SeedInventoryUpdate } from '@gardenvault/shared';

export function useSeedInventory(options?: { expiring_soon?: boolean; low_quantity?: boolean }) {
  const params = new URLSearchParams();
  if (options?.expiring_soon) params.set('expiring_soon', 'true');
  if (options?.low_quantity) params.set('low_quantity', 'true');
  const qs = params.toString();
  return useQuery({
    queryKey: ['seed-inventory', options],
    queryFn: () => api.get<{ data: SeedInventory[] }>(`/seed-inventory${qs ? `?${qs}` : ''}`),
  });
}

export function useSeedInventoryById(id: string | undefined) {
  return useQuery({
    queryKey: ['seed-inventory', id],
    queryFn: () => api.get<{ data: SeedInventory }>(`/seed-inventory/${id}`),
    enabled: !!id,
  });
}

export function useCreateSeedInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SeedInventoryCreate) => api.post<{ data: SeedInventory }>('/seed-inventory', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seed-inventory'] }); },
  });
}

export function useUpdateSeedInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SeedInventoryUpdate }) => api.patch<{ data: SeedInventory }>(`/seed-inventory/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seed-inventory'] }); },
  });
}

export function useDeleteSeedInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/seed-inventory/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seed-inventory'] }); },
  });
}

export function useDeductSeeds() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, count }: { id: string; count: number }) => api.post<{ data: SeedInventory }>(`/seed-inventory/${id}/deduct`, { count }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seed-inventory'] }); },
  });
}
