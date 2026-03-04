import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

interface Tag {
  id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export function useTags() {
  return useQuery({
    queryKey: queryKeys.tags.all,
    queryFn: () => api.get<{ data: Tag[] }>('/tags'),
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; color?: string }) => api.post<{ data: Tag }>('/tags', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tags/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
    },
  });
}

export function useAddEntityTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tagId, entity_type, entity_id }: { tagId: string; entity_type: string; entity_id: string }) =>
      api.post(`/tags/${tagId}/entities`, { entity_type, entity_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
    },
  });
}
