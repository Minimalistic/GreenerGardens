import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Feedback {
  id: string;
  feedback_type: string;
  title: string;
  description: string;
  severity: string | null;
  status: string;
  page_route: string | null;
  element_context: string | null;
  created_at: string;
  updated_at: string;
}

interface FeedbackCreate {
  feedback_type: string;
  title: string;
  description: string;
  severity?: string | null;
  page_route?: string | null;
  element_context?: string | null;
}

export function useFeedbackList(filters?: { type?: string; status?: string }) {
  const params = new URLSearchParams();
  if (filters?.type) params.set('type', filters.type);
  if (filters?.status) params.set('status', filters.status);
  const qs = params.toString();
  return useQuery({
    queryKey: ['feedback', filters],
    queryFn: () => api.get<{ data: Feedback[] }>(`/feedback${qs ? `?${qs}` : ''}`),
  });
}

export function useCreateFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FeedbackCreate) => api.post<{ data: Feedback }>('/feedback', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
    },
  });
}

export function useUpdateFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; status?: string; title?: string; description?: string }) =>
      api.patch<{ data: Feedback }>(`/feedback/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
    },
  });
}

export function useDeleteFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/feedback/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
    },
  });
}
