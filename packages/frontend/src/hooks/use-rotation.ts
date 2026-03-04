import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

interface RotationCheck {
  status: 'ok' | 'warning' | 'violation';
  message: string;
  last_planted_year: number | null;
  years_since: number | null;
  rotation_family: string;
}

interface PlotRotationHistory {
  year: number;
  families: string[];
  plants: { name: string; family: string }[];
}

export function useRotationCheck(plotId: string | null, plantCatalogId: string | null) {
  return useQuery({
    queryKey: queryKeys.rotation.check(plotId!, plantCatalogId!),
    queryFn: () => api.get<{ data: RotationCheck }>(`/rotation/check?plot=${plotId}&plant=${plantCatalogId}`),
    enabled: !!plotId && !!plantCatalogId,
  });
}

export function useRotationHistory(plotId: string | null, years = 5) {
  return useQuery({
    queryKey: queryKeys.rotation.history(plotId!, years),
    queryFn: () => api.get<{ data: PlotRotationHistory[] }>(`/rotation/history?plot=${plotId}&years=${years}`),
    enabled: !!plotId,
  });
}
