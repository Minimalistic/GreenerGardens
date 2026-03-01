import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface SoilTest {
  id: string;
  plot_id: string;
  test_date: string;
  ph: number | null;
  nitrogen_ppm: number | null;
  phosphorus_ppm: number | null;
  potassium_ppm: number | null;
  organic_matter_pct: number | null;
  calcium_ppm: number | null;
  magnesium_ppm: number | null;
  moisture_level: string | null;
  amendments_applied: string[];
  lab_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface SoilTestCreate {
  plot_id: string;
  test_date: string;
  ph?: number | null;
  nitrogen_ppm?: number | null;
  phosphorus_ppm?: number | null;
  potassium_ppm?: number | null;
  organic_matter_pct?: number | null;
  calcium_ppm?: number | null;
  magnesium_ppm?: number | null;
  moisture_level?: string | null;
  amendments_applied?: string[];
  lab_name?: string | null;
  notes?: string | null;
}

export function useSoilTests(plotId: string | null) {
  return useQuery({
    queryKey: ['soil-tests', plotId],
    queryFn: () => api.get<{ data: SoilTest[] }>(`/soil-tests?plot=${plotId}`),
    enabled: !!plotId,
  });
}

export function useSoilTestTrends(plotId: string | null) {
  return useQuery({
    queryKey: ['soil-tests', 'trends', plotId],
    queryFn: () => api.get<{ data: SoilTest[] }>(`/soil-tests/trends?plot=${plotId}`),
    enabled: !!plotId,
  });
}

export function useCreateSoilTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SoilTestCreate) => api.post<{ data: SoilTest }>('/soil-tests', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['soil-tests'] });
    },
  });
}

export function useUpdateSoilTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<SoilTestCreate>) =>
      api.patch<{ data: SoilTest }>(`/soil-tests/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['soil-tests'] });
    },
  });
}

export function useDeleteSoilTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/soil-tests/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['soil-tests'] });
    },
  });
}
