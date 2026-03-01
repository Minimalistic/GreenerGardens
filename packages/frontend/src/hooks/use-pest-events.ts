import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface PestEvent {
  id: string;
  entity_type: string;
  entity_id: string;
  pest_type: string;
  pest_name: string;
  severity: string;
  detected_date: string;
  resolved_date: string | null;
  treatment_applied: string | null;
  treatment_type: string;
  outcome: string;
  photos: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface PestEventCreate {
  entity_type: string;
  entity_id: string;
  pest_name: string;
  pest_type?: string;
  severity?: string;
  detected_date: string;
  resolved_date?: string | null;
  treatment_applied?: string;
  treatment_type?: string;
  outcome?: string;
  notes?: string;
  photos?: string[];
}

export function usePestEvents(filters?: { entity_type?: string; entity_id?: string; outcome?: string }) {
  const params = new URLSearchParams();
  if (filters?.entity_type) params.set('entity_type', filters.entity_type);
  if (filters?.entity_id) params.set('entity_id', filters.entity_id);
  if (filters?.outcome) params.set('outcome', filters.outcome);
  const qs = params.toString();
  return useQuery({
    queryKey: ['pest-events', filters],
    queryFn: () => api.get<{ data: PestEvent[] }>(`/pest-events${qs ? `?${qs}` : ''}`),
  });
}

export function usePestEvent(id: string | null) {
  return useQuery({
    queryKey: ['pest-event', id],
    queryFn: () => api.get<{ data: PestEvent }>(`/pest-events/${id}`),
    enabled: !!id,
  });
}

export function useCreatePestEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PestEventCreate) => api.post<{ data: PestEvent }>('/pest-events', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pest-events'] });
    },
  });
}

export function useUpdatePestEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<PestEventCreate>) =>
      api.patch<{ data: PestEvent }>(`/pest-events/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pest-events'] });
    },
  });
}

export function useDeletePestEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/pest-events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pest-events'] });
    },
  });
}
