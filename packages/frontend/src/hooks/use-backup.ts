import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useBackupList() {
  return useQuery({
    queryKey: queryKeys.backups.all,
    queryFn: () => api.get<{ data: any[] }>('/backup/list'),
  });
}

export function useCreateBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ data: any }>('/backup/create', {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.backups.all }); },
  });
}

export function useDeleteBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (filename: string) => api.delete(`/backup/${filename}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.backups.all }); },
  });
}

export function useIntegrityCheck() {
  return useMutation({
    mutationFn: () => api.post<{ data: { result: string } }>('/backup/integrity-check', {}),
  });
}

export function useVacuum() {
  return useMutation({
    mutationFn: () => api.post<{ data: { message: string } }>('/backup/vacuum', {}),
  });
}
